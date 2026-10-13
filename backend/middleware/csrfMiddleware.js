const crypto = require("crypto");
const { sessionIdFromRequest } = require("../util/sessionCookie");

const CSRF_SECRET = process.env.CSRF_SECRET || process.env.JWT_SECRET || "laundritrack_csrf_secret_key_12345";

/**
 * Generate a double-submit HMAC CSRF token
 */
const generateCsrfToken = (sessionId) => {
  const nonce = crypto.randomBytes(16).toString("hex");
  const hmac = crypto.createHmac("sha256", CSRF_SECRET).update(`${sessionId}:${nonce}`).digest("hex");
  return `${nonce}.${hmac}`;
};

/**
 * Verify CSRF token from incoming header
 */
const verifyCsrfToken = (token, sessionId) => {
  if (!token || typeof token !== "string" || !token.includes(".")) return false;
  const [nonce, hmac] = token.split(".");
  if (!/^[a-f\d]{32}$/i.test(nonce) || !/^[a-f\d]{64}$/i.test(hmac)) return false;
  const expectedHmac = crypto.createHmac("sha256", CSRF_SECRET).update(`${sessionId}:${nonce}`).digest("hex");
  const provided = Buffer.from(hmac, "hex");
  const expected = Buffer.from(expectedHmac, "hex");
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
};

/**
 * Express middleware to enforce CSRF token validation on state-changing methods
 */
const csrfProtection = (req, res, next) => {
  // Allow read-only HTTP methods
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  // Exempt public tracking and initial login/OTP auth endpoints
  if (
    req.path.startsWith("/api/orders/track") ||
    req.path === "/api/auth/login" ||
    req.path === "/api/auth/verify-otp" ||
    req.path === "/api/auth/resend-otp" ||
    req.path === "/api/auth/forgot-password" ||
    req.path === "/api/auth/verify-reset-otp" ||
    req.path === "/api/auth/reset-password" ||
    req.path === "/api/customer/register" ||
    req.path === "/api/customer/verify-otp" ||
    req.path === "/api/customer/google-auth"
  ) {
    return next();
  }

  const clientToken = req.headers["x-csrf-token"];
  if (!clientToken) {
    return res.status(403).json({ message: "CSRF token missing from request header (X-CSRF-Token)" });
  }

  const sessionId = sessionIdFromRequest(req);

  if (!verifyCsrfToken(clientToken, sessionId)) {
    return res.status(403).json({ message: "Invalid or expired CSRF token" });
  }

  next();
};

module.exports = {
  generateCsrfToken,
  csrfProtection,
};
