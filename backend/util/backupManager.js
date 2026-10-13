const fs = require("fs");
const path = require("path");
const supabase = require("../config/supabase");
const { encrypt, decrypt } = require("./crypto");

const BACKUP_DIR = path.resolve(process.env.BACKUP_DIR || path.join(__dirname, "../backups"));

const ensureBackupDir = () => {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true, mode: 0o700 });
  }
  if (process.platform !== "win32") fs.chmodSync(BACKUP_DIR, 0o700);
};

/**
 * Export current database tables into a timestamped JSON backup file
 */
const runDatabaseBackup = async () => {
  try {
    ensureBackupDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `backup_${timestamp}.json`;
    const filePath = path.join(BACKUP_DIR, filename);

    const tables = ["users", "customers", "services", "orders", "payments", "counters", "otp_codes", "audit_logs", "transaction_logs"];
    const dump = { timestamp: new Date().toISOString(), tables: {} };

    for (const table of tables) {
      const rows = [];
      const pageSize = 1000;
      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await supabase.from(table).select().range(offset, offset + pageSize - 1);
        if (error) throw new Error(`Could not back up ${table}: ${error.message}`);
        rows.push(...(data || []));
        if (!data || data.length < pageSize) break;
      }
      dump.tables[table] = rows;
    }

    const temporaryPath = `${filePath}.tmp`;
    fs.writeFileSync(temporaryPath, encrypt(JSON.stringify(dump)), { encoding: "utf8", mode: 0o600 });
    fs.renameSync(temporaryPath, filePath);
    if (process.platform !== "win32") fs.chmodSync(filePath, 0o600);
    console.log(`[BackupManager] Database backup successfully created: ${filePath}`);
    return { success: true, filePath, filename };
  } catch (err) {
    console.error("[BackupManager] Backup failed:", err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Restore database state from a backup JSON file
 */
const restoreDatabaseBackup = async (filename) => {
  try {
    if (typeof filename !== "string" || path.basename(filename) !== filename || !/^backup_[\w.-]+\.json$/.test(filename)) {
      throw new Error("Invalid backup filename");
    }
    const filePath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Backup file not found: ${filename}`);
    }

    const content = fs.readFileSync(filePath, "utf8");
    const dump = JSON.parse(content.startsWith("enc:") ? decrypt(content) : content);
    if (!dump || !dump.tables) {
      throw new Error("Invalid backup file format");
    }

    console.log(`[BackupManager] Starting database restore from ${filename}...`);
    const restoreErrors = [];
    for (const [table, rows] of Object.entries(dump.tables)) {
      if (Array.isArray(rows) && rows.length > 0) {
        // Upsert rows into database
        const { error } = await supabase.from(table).upsert(rows);
        if (error) {
          restoreErrors.push(`${table}: ${error.message}`);
        }
      }
    }

    if (restoreErrors.length) {
      throw new Error(`Restore incomplete: ${restoreErrors.join("; ")}`);
    }
    console.log(`[BackupManager] Database successfully restored from ${filename}`);
    return { success: true };
  } catch (err) {
    console.error("[BackupManager] Restore failed:", err.message);
    return { success: false, error: err.message };
  }
};

module.exports = {
  runDatabaseBackup,
  restoreDatabaseBackup,
  BACKUP_DIR,
};
