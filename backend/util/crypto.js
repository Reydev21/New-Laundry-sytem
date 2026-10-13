const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

const getEncryptionKey = () => {
  const secret = process.env.ENCRYPTION_KEY || (
    process.env.NODE_ENV === "production"
      ? null
      : process.env.JWT_SECRET || "laundritrack_secure_fallback_key_32bytes!!"
  );
  if (!secret) throw new Error("ENCRYPTION_KEY must be configured in production.");
  return crypto.createHash("sha256").update(secret).digest();
};

/**
 * Encrypt sensitive string data using AES-256-GCM.
 * Prefix encrypted output with "enc:" to distinguish from plain text.
 */
const encrypt = (text) => {
  if (!text || typeof text !== "string") return text;
  if (text.startsWith("enc:")) return text; // Already encrypted

  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getEncryptionKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");

    return `enc:${iv.toString("hex")}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error("Encryption error:", err.message);
    if (process.env.NODE_ENV === "production") throw err;
    return text;
  }
};

/**
 * Decrypt AES-256-GCM encrypted string data.
 */
const decrypt = (encryptedText) => {
  if (!encryptedText || typeof encryptedText !== "string") return encryptedText;
  if (!encryptedText.startsWith("enc:")) return encryptedText; // Plain text

  try {
    const parts = encryptedText.slice(4).split(":");
    if (parts.length !== 3) return encryptedText;

    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const key = getEncryptionKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (err) {
    console.error("Decryption error:", err.message);
    if (process.env.NODE_ENV === "production") throw err;
    return encryptedText;
  }
};

/**
 * Sanitize string to prevent XSS output issues.
 */
const escapeHtml = (str) => {
  if (typeof str !== "string") return str;
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

module.exports = {
  encrypt,
  decrypt,
  escapeHtml,
};
