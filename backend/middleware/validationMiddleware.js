/**
 * Password strength policy:
 * - Minimum 8 characters
 * - Must contain uppercase letter
 * - Must contain lowercase letter
 * - Must contain number
 * - Must contain special character
 */
const validatePasswordStrength = (password) => {
  if (!password || typeof password !== "string") {
    return "Password is required.";
  }
  if (Buffer.byteLength(password, "utf8") > 72) {
    return "Password must not exceed 72 UTF-8 bytes.";
  }
  if (password.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter.";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number.";
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return "Password must contain at least one special character (!@#$%^&*...).";
  }
  return null;
};

const validateRegistration = (req, res, next) => {
  const { name, email, password } = req.body;
  if (!name || typeof name !== "string" || !name.trim() || name.trim().length > 120) {
    return res.status(400).json({ message: "Name is required" });
  }
  if (typeof email !== "string" || email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ message: "Valid email address is required" });
  }

  const pwdError = validatePasswordStrength(password);
  if (pwdError) {
    return res.status(400).json({ message: pwdError });
  }

  req.body.name = name.trim();
  req.body.email = email.trim().toLowerCase();
  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  if (
    typeof email !== "string" ||
    email.trim().length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
    typeof password !== "string" ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    return res.status(400).json({ message: "Email and password are required" });
  }
  req.body.email = email.trim().toLowerCase();
  next();
};

const validateCustomerRegistration = (req, res, next) => {
  const { name, email, phone, address, password } = req.body;
  if (typeof name !== "string" || !name.trim() || name.trim().length > 120) {
    return res.status(400).json({ message: "A name of at most 120 characters is required." });
  }
  if (typeof email !== "string" || email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ message: "Valid email address is required." });
  }
  if (typeof phone !== "string" || !/^[0-9+().\- ]{7,32}$/.test(phone.trim())) {
    return res.status(400).json({ message: "A valid phone number is required." });
  }
  if (address !== undefined && (typeof address !== "string" || address.length > 500)) {
    return res.status(400).json({ message: "Address must be at most 500 characters." });
  }
  const pwdError = validatePasswordStrength(password);
  if (pwdError) return res.status(400).json({ message: pwdError });

  req.body.name = name.trim();
  req.body.email = email.trim().toLowerCase();
  req.body.phone = phone.trim();
  if (typeof address === "string") req.body.address = address.trim();
  next();
};

module.exports = {
  validatePasswordStrength,
  validateRegistration,
  validateLogin,
  validateCustomerRegistration,
};
