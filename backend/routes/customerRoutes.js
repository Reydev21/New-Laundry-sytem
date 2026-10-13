const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const {
  getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer,
} = require("../controllers/customerController");

router.use(protect, authorize("admin", "staff"));

router.route("/").get(getCustomers).post(createCustomer);
router.route("/:id").get(getCustomer).put(updateCustomer).delete(deleteCustomer);

module.exports = router;