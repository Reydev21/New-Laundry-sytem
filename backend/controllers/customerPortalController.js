const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const supabase = require("../config/supabase");
const { newId, toApi, orThrow } = require("../util/rows");
const { createOtp, verifyOtp } = require("../util/otpService");
const { sendOtpEmail } = require("../util/emailService");
const { logActivity, logTransaction } = require("../util/auditLogger");
const { encrypt, decrypt, escapeHtml } = require("../util/crypto");
const { validatePasswordStrength } = require("../middleware/validationMiddleware");
const { generateCsrfToken } = require("../middleware/csrfMiddleware");
const { sessionIdFromToken, setSessionCookie } = require("../util/sessionCookie");

const TOKEN_EXPIRY = "15m";
const exposeOtpForDevelopment = process.env.NODE_ENV !== "production" && process.env.DEBUG_OTP === "true";
const googleOAuthClient = new OAuth2Client();

const generateToken = (user) => {
  const jti = crypto.randomBytes(16).toString("hex");
  return jwt.sign(
    { id: user._id, role: user.role, name: user.name, jti },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || TOKEN_EXPIRY }
  );
};

const withToken = (user, res) => {
  const token = generateToken(user);
  setSessionCookie(res, token);
  const sessionId = sessionIdFromToken(token);
  const csrfToken = generateCsrfToken(sessionId);

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    csrfToken,
  };
};

/**
 * Register Customer Account with OTP Verification
 */
exports.registerCustomer = async (req, res, next) => {
  try {
    const { name, email, phone, address, password } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: "Name is required" });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Valid email is required" });
    if (!phone || !phone.trim()) return res.status(400).json({ message: "Phone number is required" });

    const pwdErr = validatePasswordStrength(password);
    if (pwdErr) return res.status(400).json({ message: pwdErr });

    const taken = orThrow(
      await supabase.from("users").select("id").eq("email", email).maybeSingle()
    );
    if (taken) return res.status(400).json({ message: "An account with this email already exists." });

    // Customer self-registration must never create a staff or administrator account.
    const userId = newId();
    const userInsert = await supabase
      .from("users")
      .insert({
        id: userId,
        name: name.trim(),
        email: email.trim(),
        password: await bcrypt.hash(password, 10),
        role: "customer",
      })
      .select()
      .single();

    const userRow = orThrow(userInsert);

    // Create linked customer profile
    try {
      await supabase.from("customers").insert({
        id: newId(),
        userId: userId,
        name: name.trim(),
        phone: encrypt(phone.trim()),
        address: address ? encrypt(address.trim()) : null,
        email: email.trim(),
      });
    } catch (custErr) {
      await supabase.from("customers").insert({
        id: newId(),
        name: name.trim(),
        phone: encrypt(phone.trim()),
        address: address ? encrypt(address.trim()) : null,
        email: email.trim(),
      });
    }

    const otpResult = await createOtp(userId);
    const emailSend = await sendOtpEmail({
      to: email.trim(),
      name: name.trim(),
      otp: otpResult.otpCode,
    });
    const tempToken = jwt.sign(
      { id: userId, isPreAuth: true },
      process.env.JWT_SECRET,
      { expiresIn: "10m" }
    );

    console.log(`\n==========================================`);
    console.log(`[CUSTOMER REGISTRATION OTP] Email: ${email}`);
    if (exposeOtpForDevelopment) {
      console.log(`[CUSTOMER REGISTRATION OTP] Code: ${otpResult.otpCode}`);
    }
    console.log(`==========================================\n`);

    res.status(201).json({
      requiresOtp: true,
      tempToken,
      message: emailSend.sent
        ? "Registration OTP has been sent to your email."
        : "Registration OTP is ready. Enable SMTP to email it automatically.",
      ...(exposeOtpForDevelopment ? { otpCode: otpResult.otpCode } : {}),
      email: email.trim(),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Verify Customer OTP and Complete Sign up
 */
exports.verifyCustomerOtp = async (req, res, next) => {
  try {
    const { tempToken, otpCode } = req.body;
    if (!tempToken || !otpCode) return res.status(400).json({ message: "Token and OTP code required" });

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Registration session expired. Please sign up again." });
    }

    const verification = await verifyOtp(decoded.id, otpCode);
    if (!verification.success) {
      return res.status(400).json({ message: verification.message });
    }

    const userRow = orThrow(
      await supabase.from("users").select().eq("id", decoded.id).single()
    );
    const apiUser = toApi(userRow);

    await logActivity({
      req,
      user: apiUser,
      action: "CUSTOMER_REGISTERED_VERIFIED",
      resource: "users",
      resourceId: apiUser._id,
      details: { email: apiUser.email, role: "customer" },
    });

    res.json(withToken(apiUser, res));
  } catch (err) {
    next(err);
  }
};

/**
 * Google Auth / Registration for Customer
 */
exports.googleAuthCustomer = async (req, res, next) => {
  try {
    const { credential } = req.body;
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      return res.status(503).json({ message: "Google sign-in is not configured on the backend." });
    }
    if (typeof credential !== "string" || credential.length > 10000) {
      return res.status(400).json({ message: "A valid Google sign-in credential is required." });
    }

    let payload;
    try {
      const ticket = await googleOAuthClient.verifyIdToken({
        idToken: credential,
        audience: googleClientId,
      });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({ message: "Google sign-in credential is invalid or expired." });
    }

    if (!payload?.email || payload.email_verified !== true || !payload.name) {
      return res.status(401).json({ message: "Google account must have a verified email address." });
    }

    const email = payload.email.trim().toLowerCase();
    let userRow = orThrow(
      await supabase.from("users").select().eq("email", email).maybeSingle()
    );

    if (userRow && userRow.role !== "customer") {
      return res.status(403).json({ message: "This Google account is not registered as a customer." });
    }

    if (!userRow) {
      const setupToken = jwt.sign(
        { email, name: payload.name.trim().slice(0, 120), isPreAuth: true, purpose: "google-setup-password" },
        process.env.JWT_SECRET,
        { expiresIn: "10m" }
      );
      await logActivity({
        req,
        action: "GOOGLE_SIGNUP_PASSWORD_REQUIRED",
        resource: "users",
        details: { email },
      });
      return res.json({
        requiresPassword: true,
        setupToken,
        email,
        name: payload.name.trim(),
        message: "Welcome! Set a password to finish creating your account.",
      });
    }

    const linkedProfile = orThrow(
      await supabase.from("customers").select("id").eq("userId", userRow.id).maybeSingle()
    );
    if (!linkedProfile) {
      orThrow(await supabase.from("customers").insert({
        id: newId(),
        userId: userRow.id,
        name: userRow.name,
        phone: encrypt("0000000000"),
        email,
      }));
    }

    const apiUser = toApi(userRow);
    await logActivity({
      req,
      user: apiUser,
      action: "GOOGLE_LOGIN_SUCCESS",
      resource: "users",
      resourceId: apiUser._id,
    });

    return res.json(withToken(apiUser, res));
  } catch (err) {
    next(err);
  }
};

/**
 * Complete Google sign-up: set password, create account, start session
 */
exports.completeGoogleSignup = async (req, res, next) => {
  try {
    const { setupToken, password } = req.body;
    if (typeof setupToken !== "string" || !setupToken) {
      return res.status(400).json({ message: "Google sign-up session is required." });
    }

    let decoded;
    try {
      decoded = jwt.verify(setupToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Google sign-up session expired. Please continue with Google again." });
    }
    if (!decoded.isPreAuth || decoded.purpose !== "google-setup-password" || !decoded.email) {
      return res.status(400).json({ message: "Invalid Google sign-up session." });
    }

    const pwdErr = validatePasswordStrength(password);
    if (pwdErr) return res.status(400).json({ message: pwdErr });

    const existing = orThrow(
      await supabase.from("users").select("id").eq("email", decoded.email).maybeSingle()
    );
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists. Please continue with Google again to sign in." });
    }

    const userId = newId();
    const userRow = orThrow(await supabase
      .from("users")
      .insert({
        id: userId,
        name: decoded.name,
        email: decoded.email,
        password: await bcrypt.hash(password, 10),
        role: "customer",
      })
      .select()
      .single());

    orThrow(await supabase.from("customers").insert({
      id: newId(),
      userId,
      name: decoded.name,
      phone: encrypt("0000000000"),
      email: decoded.email,
    }));

    const apiUser = toApi(userRow);
    await logActivity({
      req,
      user: apiUser,
      action: "GOOGLE_SIGNUP_COMPLETED",
      resource: "users",
      resourceId: apiUser._id,
      details: { email: apiUser.email },
    });

    return res.json(withToken(apiUser, res));
  } catch (err) {
    next(err);
  }
};

/**
 * Place a Laundry Order as a Customer (Self-Service)
 */
exports.createCustomerOrder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { serviceId, weight, colorType = "Colored", paymentMethod = "GCash", referenceNumber } = req.body;

    if (typeof serviceId !== "string" || !serviceId.trim() || serviceId.length > 80) {
      return res.status(400).json({ message: "A valid service is required" });
    }
    const numericWeight = Number(weight);
    if (!Number.isFinite(numericWeight) || numericWeight <= 0) {
      return res.status(400).json({ message: "Weight must be greater than 0 kg" });
    }

    if (!["Colored", "White", "Mixed"].includes(colorType)) {
      return res.status(400).json({ message: "Color selection must be Colored, White, or Mixed" });
    }
    if (!["Cash", "GCash", "Maya", "Bank Transfer", "Online Bank"].includes(paymentMethod)) {
      return res.status(400).json({ message: "Invalid payment method" });
    }
    if (referenceNumber !== undefined && referenceNumber !== null &&
      (typeof referenceNumber !== "string" || referenceNumber.trim().length > 160)) {
      return res.status(400).json({ message: "Payment reference must be at most 160 characters." });
    }
    const cleanedReference = typeof referenceNumber === "string" ? referenceNumber.trim() : "";

    // Get customer profile linked to user
    let customer = orThrow(
      await supabase.from("customers").select().eq("userId", userId).maybeSingle()
    );

    if (!customer) {
      // Fallback find customer by email
      customer = orThrow(
        await supabase.from("customers").select().eq("email", req.user.email).maybeSingle()
      );
    }

    if (!customer) {
      // Create profile on the fly if missing
      customer = orThrow(
        await supabase
          .from("customers")
          .insert({
            id: newId(),
            userId: userId,
            name: req.user.name,
            phone: encrypt("09000000000"),
            email: req.user.email,
          })
          .select()
          .single()
      );
    }

    const service = orThrow(
      await supabase.from("services").select().eq("id", serviceId).maybeSingle()
    );
    if (!service || service.status !== "active") {
      return res.status(400).json({ message: "Selected service is unavailable" });
    }

    // Generate Order Number
    const generateOrderNumber = async () => {
      for (;;) {
        const rows = orThrow(await supabase.rpc("next_sequence", { counter_id: "orderNumber" }));
        const orderNumber = `LAUNDRY-${1000 + Number(rows[0].next_seq)}`;
        const clash = orThrow(
          await supabase.from("orders").select("id").eq("orderNumber", orderNumber).maybeSingle()
        );
        if (!clash) return orderNumber;
      }
    };

    const orderNumber = await generateOrderNumber();
    const totalAmount = service.price * numericWeight;

    // Determine initial payment status if online payment & reference provided
    const isOnlinePayment = ["GCash", "Maya", "Bank Transfer", "Online Bank"].includes(paymentMethod);
    const paymentStatus = isOnlinePayment && cleanedReference ? "PAID" : "UNPAID";

    const orderId = newId();
    const order = orThrow(
      await supabase
        .from("orders")
        .insert({
          id: orderId,
          orderNumber,
          customerId: customer.id,
          serviceId,
          colorType,
          weight: numericWeight,
          pricePerKg: service.price,
          totalAmount,
          paymentStatus,
          orderStatus: "Received",
        })
        .select()
        .single()
    );

    const apiOrder = toApi(order);

    // Record online payment if reference provided
    let paymentData = null;
    if (isOnlinePayment && cleanedReference) {
      const paymentId = newId();
      const payment = orThrow(
        await supabase
          .from("payments")
          .insert({
            id: paymentId,
            orderId: orderId,
            amount: totalAmount,
            paymentMethod,
            paymentStatus: "PAID",
            referenceNumber: encrypt(cleanedReference),
          })
          .select()
          .single()
      );
      paymentData = toApi(payment);

      await logTransaction({
        paymentId,
        orderId,
        type: "ONLINE_PAYMENT_SUBMITTED",
        amount: totalAmount,
        paymentMethod,
        paymentStatus: "PAID",
        reference: cleanedReference,
        createdBy: req.user.id,
      });
    }

    await logActivity({
      req,
      user: req.user,
      action: "CUSTOMER_ORDER_PLACED",
      resource: "orders",
      resourceId: orderId,
      details: { orderNumber, colorType, weight: numericWeight, paymentMethod, totalAmount },
    });

    res.status(201).json({
      order: apiOrder,
      payment: paymentData,
      message: "Order placed successfully!",
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Customer's Orders
 */
exports.getMyOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;

    let customer = null;
    try {
      const { data } = await supabase.from("customers").select("id").eq("userId", userId).maybeSingle();
      customer = data;
    } catch (e) {}

    if (!customer && userEmail) {
      const { data } = await supabase.from("customers").select("id").eq("email", userEmail).maybeSingle();
      customer = data;
    }

    if (!customer) return res.json([]);

    const orders = orThrow(
      await supabase
        .from("orders")
        .select("*, service:services(serviceName, price, unit)")
        .eq("customerId", customer.id)
        .order("createdAt", { ascending: false })
    );

    res.json(toApi(orders));
  } catch (err) {
    next(err);
  }
};
