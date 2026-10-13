const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const supabase = require("../config/supabase");
const { newId, toApi, orThrow } = require("../util/rows");
const { createOtp, verifyOtp } = require("../util/otpService");
const { sendOtpEmail } = require("../util/emailService");
const { logActivity } = require("../util/auditLogger");
const { generateCsrfToken } = require("../middleware/csrfMiddleware");
const { validatePasswordStrength } = require("../middleware/validationMiddleware");
const { sessionIdFromToken, sessionIdFromRequest, setSessionCookie, clearSessionCookie } = require("../util/sessionCookie");

// 15 minutes session token expiration for strict security (Requirement 3)
const TOKEN_EXPIRY = "15m";
const exposeOtpForDevelopment = process.env.NODE_ENV !== "production" && process.env.DEBUG_OTP === "true";

const generateToken = (user) => {
  const jti = crypto.randomBytes(16).toString("hex"); // Regenerated session ID / JWT ID
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

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const taken = orThrow(
      await supabase.from("users").select("id").eq("email", email).maybeSingle()
    );
    if (taken) return res.status(400).json({ message: "Email already in use" });

    const created = orThrow(
      await supabase
        .from("users")
        .insert({
          id: newId(),
          name,
          email,
          password: await bcrypt.hash(password, 10),
          role: role || "staff",
          isTwoFactorEnabled: false,
        })
        .select()
        .single()
    );

    const apiUser = toApi(created);
    await logActivity({
      req,
      user: req.user,
      action: "USER_REGISTERED",
      resource: "users",
      resourceId: apiUser._id,
      details: { name: apiUser.name, email: apiUser.email, role: apiUser.role },
    });

    res.status(201).json({
      _id: apiUser._id,
      name: apiUser.name,
      email: apiUser.email,
      role: apiUser.role,
      message: "Account created. The user must sign in to start a session.",
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const row = orThrow(
      await supabase.from("users").select().eq("email", email).maybeSingle()
    );
    if (!row) {
      await logActivity({ req, action: "LOGIN_FAILED", resource: "users", details: { email, reason: "User not found" } });
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, row.password);
    if (!match) {
      await logActivity({ req, action: "LOGIN_FAILED", resource: "users", details: { email, reason: "Password mismatch" } });
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const apiUser = toApi(row);

    await logActivity({
      req,
      user: apiUser,
      action: "LOGIN_SUCCESS",
      resource: "users",
      resourceId: apiUser._id,
    });

    res.json(withToken(apiUser, res));
  } catch (err) {
    next(err);
  }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const { tempToken, otpCode } = req.body;
    if (typeof tempToken !== "string" || typeof otpCode !== "string" || !/^\d{6}$/.test(otpCode)) {
      return res.status(400).json({ message: "Temporary pre-auth token and OTP code are required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Pre-auth session expired or invalid. Please log in again." });
    }

    if (!decoded.isPreAuth || !decoded.id) {
      return res.status(400).json({ message: "Invalid pre-auth token payload" });
    }

    const verification = await verifyOtp(decoded.id, otpCode);
    if (!verification.success) {
      await logActivity({
        req,
        action: "OTP_VERIFICATION_FAILED",
        resource: "users",
        resourceId: decoded.id,
        details: verification.message,
      });
      return res.status(400).json({ message: verification.message });
    }

    const row = orThrow(
      await supabase.from("users").select().eq("id", decoded.id).single()
    );
    const apiUser = toApi(row);

    await logActivity({
      req,
      user: apiUser,
      action: "LOGIN_SUCCESS_2FA",
      resource: "users",
      resourceId: apiUser._id,
      details: "2FA OTP successfully verified",
    });

    res.json(withToken(apiUser, res));
  } catch (err) {
    next(err);
  }
};

exports.resendOtp = async (req, res, next) => {
  try {
    const { tempToken } = req.body;
    if (typeof tempToken !== "string" || !tempToken) {
      return res.status(400).json({ message: "Temporary pre-auth token required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Session expired. Please log in again." });
    }

    const row = orThrow(
      await supabase.from("users").select().eq("id", decoded.id).single()
    );
    const apiUser = toApi(row);

    const otpResult = await createOtp(apiUser._id);
    const emailSend = await sendOtpEmail({
      to: apiUser.email,
      name: apiUser.name,
      otp: otpResult.otpCode,
    });

    console.log(`\n==========================================`);
    console.log(`[2FA RESEND OTP CODE] User: ${apiUser.email}`);
    if (exposeOtpForDevelopment) {
      console.log(`[2FA RESEND OTP CODE] Code: ${otpResult.otpCode}`);
    }
    console.log(`==========================================\n`);

    res.json({
      message: emailSend.sent
        ? "New OTP code sent to your email."
        : "New OTP code generated. Enable SMTP to send it by email.",
      ...(exposeOtpForDevelopment ? { otpCode: otpResult.otpCode } : {}),
    });
  } catch (err) {
    next(err);
  }
};

exports.requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (typeof email !== "string" || email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ message: "A valid email address is required." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const row = await supabase.from("users").select("id, name, email").eq("email", normalizedEmail).maybeSingle();
    if (!row.data) {
      return res.json({
        message: "If that email is registered, a password reset OTP has been sent.",
      });
    }

    try {
      const otpResult = await createOtp(row.data.id);
      const emailSend = await sendOtpEmail({
        to: row.data.email,
        name: row.data.name,
        otp: otpResult.otpCode,
      });

      if (!emailSend.sent) {
        const reason = String(emailSend.reason || "");
        console.error("[PASSWORD RESET EMAIL] Delivery failed:", reason);
        if (/Invalid login|BadCredentials|535|Username and Password not accepted/i.test(reason)) {
          return res.status(502).json({
            message: "Gmail rejected the SMTP login. Create a new Google App Password for the exact sender account in SMTP_USER, replace SMTP_PASS in backend/.env, then restart the backend.",
          });
        }
        if (/SMTP not configured/i.test(reason)) {
          return res.status(503).json({
            message: "Email delivery is not configured. Add a new Google App Password to SMTP_PASS in backend/.env for the SMTP_USER account, then restart the backend.",
          });
        }
        return res.status(502).json({
          message: "Could not deliver the reset code by email. Check the backend SMTP configuration and restart the backend.",
        });
      }

      console.log(`\n==========================================`);
      console.log(`[PASSWORD RESET OTP] Email: ${row.data.email}`);
      if (exposeOtpForDevelopment) {
        console.log(`[PASSWORD RESET OTP] Code: ${otpResult.otpCode}`);
      }
      console.log(`==========================================\n`);

      return res.json({
        message: emailSend.sent
          ? "A password reset OTP has been sent to your email."
          : "A password reset OTP was generated. Enable SMTP to send it by email.",
        ...(exposeOtpForDevelopment ? { otpCode: otpResult.otpCode } : {}),
      });
    } catch (otpError) {
      const msg = String(otpError?.message || "");
      if (msg.includes("otp_codes") || msg.includes("relation \"otp_codes\"")) {
        return res.status(500).json({
          message: "OTP storage is not ready in Supabase. Please run the otp_codes SQL setup first.",
        });
      }
      if (msg.includes("Invalid login") || msg.includes("BadCredentials") || msg.includes("SMTP") || msg.includes("535")) {
        return res.status(500).json({
          message: "Gmail SMTP credentials are invalid. Please update the app password in backend/.env.",
        });
      }
      return res.status(500).json({
        message: "Could not send password reset OTP. Please check SMTP and Supabase setup.",
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.verifyPasswordResetOtp = async (req, res, next) => {
  try {
    const { email, otpCode } = req.body;
    if (
      typeof email !== "string" ||
      email.trim().length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof otpCode !== "string" ||
      !/^\d{6}$/.test(otpCode)
    ) {
      return res.status(400).json({ message: "A valid email address and 6-digit OTP code are required." });
    }

    const row = await supabase.from("users").select("id").eq("email", email.trim().toLowerCase()).maybeSingle();
    if (!row.data) {
      return res.status(400).json({ message: "Invalid request." });
    }

    const verification = await verifyOtp(row.data.id, otpCode);
    if (!verification.success) {
      return res.status(400).json({ message: verification.message || "Invalid OTP code." });
    }

    const resetToken = jwt.sign(
      { id: row.data.id, purpose: "password-reset" },
      process.env.JWT_SECRET,
      { expiresIn: "10m" }
    );

    return res.json({
      message: "OTP verified. Enter your new password.",
      resetToken,
    });
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      return res.status(400).json({ message: "Reset token and new password are required." });
    }

    const pwdError = validatePasswordStrength(newPassword);
    if (pwdError) {
      return res.status(400).json({ message: pwdError });
    }

    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Password reset session expired. Please try again." });
    }

    if (!decoded || decoded.purpose !== "password-reset") {
      return res.status(400).json({ message: "Invalid password reset token." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updated = await supabase
      .from("users")
      .update({ password: hashedPassword })
      .eq("id", decoded.id)
      .select("id, email");

    if (updated.error) {
      return res.status(500).json({ message: "Could not update password." });
    }

    await logActivity({
      req,
      action: "PASSWORD_RESET",
      resource: "users",
      resourceId: decoded.id,
      details: { email: updated.data?.[0]?.email || "unknown" },
    });

    return res.json({ message: "Password reset successful. You can log in with your new password." });
  } catch (err) {
    next(err);
  }
};

exports.getCsrfToken = (req, res) => {
  const sessionId = sessionIdFromRequest(req);
  const csrfToken = generateCsrfToken(sessionId);
  res.json({ csrfToken });
};

exports.logout = (req, res) => {
  clearSessionCookie(res);
  res.json({ message: "Logged out successfully" });
};
