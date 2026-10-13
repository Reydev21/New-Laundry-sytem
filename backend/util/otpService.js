const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const supabase = require("../config/supabase");
const { newId, orThrow } = require("./rows");

const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 3;

/**
 * Generate a cryptographically strong 6-digit OTP
 */
const generateOtpCode = () => {
  return Math.floor(100000 + crypto.randomInt(900000)).toString();
};

/**
 * Store a newly generated OTP for a user
 */
const createOtp = async (userId) => {
  const otpCode = generateOtpCode();
  const otpHash = await bcrypt.hash(otpCode, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

  // Invalidate previous active OTPs for this user
  await supabase
    .from("otp_codes")
    .update({ isVerified: true })
    .eq("userId", userId)
    .eq("isVerified", false);

  const inserted = orThrow(
    await supabase
      .from("otp_codes")
      .insert({
        id: newId(),
        userId,
        otpHash,
        expiresAt,
        attempts: 0,
        isVerified: false,
      })
      .select()
      .single()
  );

  return { otpCode, id: inserted.id, expiresAt };
};

/**
 * Verify an OTP code provided by a user
 */
const verifyOtp = async (userId, otpCode) => {
  const record = orThrow(
    await supabase
      .from("otp_codes")
      .select()
      .eq("userId", userId)
      .eq("isVerified", false)
      .gt("expiresAt", new Date().toISOString())
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle()
  );

  if (!record) {
    return { success: false, message: "Invalid or expired OTP" };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    return { success: false, message: "Maximum OTP attempts exceeded. Please request a new code." };
  }

  const match = await bcrypt.compare(String(otpCode).trim(), record.otpHash);
  if (!match) {
    // Increment attempt counter
    await supabase
      .from("otp_codes")
      .update({ attempts: record.attempts + 1 })
      .eq("id", record.id);

    const remaining = MAX_ATTEMPTS - (record.attempts + 1);
    return {
      success: false,
      message: `Invalid OTP code. ${remaining > 0 ? `${remaining} attempts remaining.` : "Please request a new code."}`,
    };
  }

  // Mark OTP as verified
  await supabase
    .from("otp_codes")
    .update({ isVerified: true })
    .eq("id", record.id);

  return { success: true };
};

module.exports = {
  createOtp,
  verifyOtp,
};
