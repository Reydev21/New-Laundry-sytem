const supabase = require("../config/supabase");
const { newId } = require("./rows");
const { encrypt } = require("./crypto");

/**
 * Record user activity in audit_logs
 */
const logActivity = async ({ req, user, action, resource, resourceId, details }) => {
  try {
    const userInfo = user || req?.user || {};
    const ipAddress = req?.ip || req?.socket?.remoteAddress || "127.0.0.1";

    const detailPayload =
      details && typeof details === "object" ? { ...details } : details ? { note: details } : {};
    // When a re-authenticated OTP backed the action, record who approved it for the audit trail.
    if (req?.reauth?.verifiedAt) {
      detailPayload.reauthVerifiedAt = req.reauth.verifiedAt;
      detailPayload.approvedBy = `${userInfo.name || "System"} (${userInfo.role || "system"})`;
    }

    await supabase.from("audit_logs").insert({
      id: newId(),
      userId: userInfo.id || userInfo._id || null,
      userName: userInfo.name || "System",
      userRole: userInfo.role || "system",
      action,
      resource,
      resourceId: resourceId ? String(resourceId) : null,
      details: JSON.stringify(detailPayload),
      ipAddress,
    });
  } catch (err) {
    console.error("Failed to log activity audit:", err.message);
  }
};

/**
 * Record financial transaction in transaction_logs
 */
const logTransaction = async ({ paymentId, orderId, type, amount, paymentMethod, paymentStatus, reference, createdBy }) => {
  try {
    await supabase.from("transaction_logs").insert({
      id: newId(),
      paymentId: paymentId ? String(paymentId) : null,
      orderId: orderId ? String(orderId) : null,
      type: type || "PAYMENT_RECORDED",
      amount: Number(amount || 0),
      paymentMethod: paymentMethod || "Cash",
      paymentStatus: paymentStatus || "PAID",
      reference: reference ? encrypt(String(reference)) : null,
      createdBy: createdBy ? String(createdBy) : "System",
    });
  } catch (err) {
    console.error("Failed to log transaction:", err.message);
  }
};

module.exports = {
  logActivity,
  logTransaction,
};
