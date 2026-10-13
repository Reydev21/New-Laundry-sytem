const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const {
  getServices, createService, updateService, deleteService,
} = require("../controllers/serviceController");

router.get("/", getServices); // public
router.use(protect);
router.post("/", authorize("admin"), createService);
router.put("/:id", authorize("admin"), updateService);
router.delete("/:id", authorize("admin"), deleteService);

module.exports = router;