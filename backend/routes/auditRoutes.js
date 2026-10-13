const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const supabase = require("../config/supabase");
const { orThrow, toApi } = require("../util/rows");
const { runDatabaseBackup, BACKUP_DIR } = require("../util/backupManager");
const { decrypt } = require("../util/crypto");
const fs = require("fs");

router.use(protect);
router.use(authorize("admin"));

// GET /api/audit-logs
router.get("/audit-logs", async (req, res, next) => {
  try {
    const logs = orThrow(
      await supabase.from("audit_logs").select().order("createdAt", { ascending: false }).limit(200)
    );
    res.json(toApi(logs));
  } catch (err) {
    next(err);
  }
});

// GET /api/transaction-logs
router.get("/transaction-logs", async (req, res, next) => {
  try {
    const logs = orThrow(
      await supabase.from("transaction_logs").select().order("createdAt", { ascending: false }).limit(200)
    );
    res.json(toApi(logs.map((log) => ({
      ...log,
      reference: log.reference ? decrypt(log.reference) : log.reference,
    }))));
  } catch (err) {
    next(err);
  }
});

// POST /api/backups/trigger
router.post("/backups/trigger", async (req, res, next) => {
  try {
    const result = await runDatabaseBackup();
    if (!result.success) {
      return res.status(500).json({ message: "Backup failed", error: result.error });
    }
    res.json({ message: "Database backup created successfully", filename: result.filename });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
