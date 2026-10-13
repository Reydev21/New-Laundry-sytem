const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const { validateCustomerRegistration } = require("../middleware/validationMiddleware");
const rateLimit = require("express-rate-limit");
const {
  registerCustomer,
  verifyCustomerOtp,
  googleAuthCustomer,
  createCustomerOrder,
  getMyOrders,
} = require("../controllers/customerPortalController");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many registration/OTP attempts. Please try again after 15 minutes." },
});

router.post("/register", authLimiter, validateCustomerRegistration, registerCustomer);
router.post("/verify-otp", authLimiter, verifyCustomerOtp);
router.post("/google-auth", authLimiter, googleAuthCustomer);

router.use(protect, authorize("customer"));
router.route("/orders").post(createCustomerOrder).get(getMyOrders);

module.exports = router;
