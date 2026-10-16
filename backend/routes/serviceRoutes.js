const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const requireActionReauth = require("../middleware/actionReauthMiddleware");
const {
  getServices, createService, updateService, deleteService,
} = require("../controllers/serviceController");

router.get("/", getServices); // public
router.use(protect);
router.post("/", authorize("admin"), requireActionReauth, createService);
router.put("/:id", authorize("admin"), requireActionReauth, updateService);
router.delete("/:id", authorize("admin"), requireActionReauth, deleteService);

module.exports = router;