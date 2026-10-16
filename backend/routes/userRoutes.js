const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const requireActionReauth = require("../middleware/actionReauthMiddleware");
const { getUsers, getSignupInviteCode, createUser, updateUser, deleteUser } = require("../controllers/userController");

router.use(protect, authorize("admin"));

router.get("/", getUsers);
router.get("/invite-code", getSignupInviteCode);
router.post("/", requireActionReauth, createUser);
router.put("/:id", requireActionReauth, updateUser);
router.delete("/:id", requireActionReauth, deleteUser);

module.exports = router;
