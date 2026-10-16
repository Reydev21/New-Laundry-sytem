const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const requireActionReauth = require("../middleware/actionReauthMiddleware");
const {
  getOrders, getOrder, createOrder, updateOrder, deleteOrder, updateStatus, trackOrder,
} = require("../controllers/orderController");

// public tracking
router.get("/track/:orderNumber", trackOrder);

router.use(protect, authorize("admin", "staff"));
router.route("/").get(getOrders).post(createOrder);
// Editing or deleting an order is a high-risk (void) action and needs re-authentication.
router.route("/:id").get(getOrder).put(requireActionReauth, updateOrder).delete(requireActionReauth, deleteOrder);
router.put("/:id/status", updateStatus);

module.exports = router;