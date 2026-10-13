const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const { recordPayment, getPayments } = require("../controllers/paymentController");

router.use(protect, authorize("admin", "staff"));
router.route("/").get(getPayments).post(recordPayment);

module.exports = router;