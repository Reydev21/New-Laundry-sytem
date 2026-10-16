const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const { validateRegistration, validateLogin } = require("../middleware/validationMiddleware");
const {
  register,
  registerStaffAccount,
  login,
  verifyOtp,
  resendOtp,
  requestPasswordReset,
  verifyPasswordResetOtp,
  resetPassword,
  requestActionOtp,
  verifyActionOtp,
  getCsrfToken,
  logout,
} = require("../controllers/authController");
const rateLimit = require("express-rate-limit");

// Strict rate limiting for login & OTP verification (Requirement 6)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit to 10 attempts per 15 minutes per IP
  message: { message: "Too many login/OTP verification attempts. Please try again after 15 minutes." },
});
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: "Too many password reset attempts. Try again in one hour." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get("/csrf-token", getCsrfToken);
router.post("/logout", protect, logout);
router.post("/action-otp/request", protect, authLimiter, requestActionOtp);
router.post("/action-otp/verify", protect, authLimiter, verifyActionOtp);
router.post("/login", authLimiter, validateLogin, login);
router.post("/signup", authLimiter, registerStaffAccount);
router.post("/verify-otp", authLimiter, verifyOtp);
router.post("/resend-otp", authLimiter, resendOtp);
router.post("/forgot-password", passwordResetLimiter, requestPasswordReset);
router.post("/verify-reset-otp", passwordResetLimiter, verifyPasswordResetOtp);
router.post("/reset-password", passwordResetLimiter, resetPassword);
router.post("/register", protect, authorize("admin"), validateRegistration, register);

module.exports = router;
