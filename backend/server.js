// 1. FORCE GOOGLE DNS (This must be at the very top)
const dns = require('node:dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

// 2. Standard Imports
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
require("dotenv").config();

// 3. Internal Imports
const supabase = require("./config/supabase");
const errorMiddleware = require("./middleware/errorMiddleware");
const { csrfProtection } = require("./middleware/csrfMiddleware");
const { runDatabaseBackup } = require("./util/backupManager");

const authRoutes = require("./routes/authRoutes");
const customerRoutes = require("./routes/customerRoutes");
const orderRoutes = require("./routes/orderRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const reportRoutes = require("./routes/reportRoutes");
const auditRoutes = require("./routes/auditRoutes");
const customerPortalRoutes = require("./routes/customerPortalRoutes");

// 4. Security Imports
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// 5. Initialize App & Connect to Database
const app = express();
const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = new Set([
  ...(process.env.CORS_ORIGINS || "").split(",").map((origin) => origin.trim()).filter(Boolean),
  ...(!isProduction ? ["http://localhost:5173", "http://127.0.0.1:5173"] : []),
]);
app.set("trust proxy", isProduction ? 1 : false);

if (isProduction) {
  if (!process.env.JWT_SECRET || Buffer.byteLength(process.env.JWT_SECRET) < 32) {
    throw new Error("Production requires a JWT_SECRET of at least 32 bytes.");
  }
  if (!process.env.ENCRYPTION_KEY || Buffer.byteLength(process.env.ENCRYPTION_KEY) < 32) {
    throw new Error("Production requires a separate ENCRYPTION_KEY of at least 32 bytes.");
  }
  if (!process.env.CORS_ORIGINS) {
    throw new Error("Production requires CORS_ORIGINS to list the trusted frontend origins.");
  }
  const productionOrigins = process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean);
  if (!productionOrigins.length || productionOrigins.some((origin) => {
    try {
      return new URL(origin).protocol !== "https:";
    } catch {
      return true;
    }
  })) {
    throw new Error("Production CORS_ORIGINS must contain valid HTTPS origins only.");
  }
  if (!process.env.BACKUP_DIR) {
    throw new Error("Production requires BACKUP_DIR to point to a separate backup volume or mount.");
  }
  const backupDir = path.resolve(process.env.BACKUP_DIR);
  const projectRoot = path.resolve(__dirname, "..");
  if (backupDir === projectRoot || backupDir.startsWith(`${projectRoot}${path.sep}`)) {
    throw new Error("Production BACKUP_DIR must be outside the application directory.");
  }
}

const checkSupabase = async () => {
  const { error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true });
  if (error) {
    console.error("Supabase check failed:", error.message);
    console.error("Has backend/supabase/schema.sql been run in the SQL Editor yet?");
    process.exit(1);
  }
  console.log("Supabase connected");
};

// 6. Security Middleware & Headers (Requirement 5 & Requirement 2)
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(Object.assign(new Error("Origin not allowed by CORS"), { status: 403 }));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
}));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.use((req, res, next) => {
  if (isProduction && !req.secure) {
    return res.status(426).json({ message: "HTTPS is required." });
  }
  next();
});

// Strict HTTP Security Headers via Helmet (HSTS, Frameguard, NoSniff, XSS Filter)
app.use(
  helmet({
    hsts: isProduction ? {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    } : false,
    frameguard: { action: "deny" },
    noSniff: true,
    xssFilter: true,
  })
);

// API Rate Limiting (Requirement 6)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per 15 mins per IP
  message: { message: "Too many requests from this IP, please try again later." },
});
app.use("/api", generalLimiter);

// Anti-CSRF Token Validation (Requirement 4)
app.use(csrfProtection);

// 7. Routes
app.get("/", (req, res) => res.json({ message: "LaundriTrack API with Security Controls is running" }));

app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/logs", auditRoutes);
app.use("/api/customer", customerPortalRoutes);

// 8. Error Handling Middleware
app.use(errorMiddleware);

// 9. Automated Database Backup Scheduler (Requirement 7)
// Triggers automatic database backup every 24 hours
const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
let backupRunning = false;
setInterval(() => {
  if (backupRunning) return;
  backupRunning = true;
  console.log("[Scheduler] Running automated daily database backup...");
  runDatabaseBackup()
    .catch((err) => console.error("[Scheduler] Automated backup failed:", err.message))
    .finally(() => { backupRunning = false; });
}, BACKUP_INTERVAL_MS);

// 10. Start Server
const PORT = Number(process.env.PORT || 5000);
checkSupabase().then(() =>
  app.listen(PORT, () => {
    console.log(`Server running securely on port ${PORT}`);
  })
);