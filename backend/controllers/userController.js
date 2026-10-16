const bcrypt = require("bcryptjs");
const supabase = require("../config/supabase");
const { newId, orThrow, count } = require("../util/rows");
const { logActivity } = require("../util/auditLogger");
const { getInviteCode } = require("../util/inviteCode");
const { createOtp } = require("../util/otpService");
const { sendOtpEmail } = require("../util/emailService");
const { validatePasswordStrength } = require("../middleware/validationMiddleware");

const ROLES = ["admin", "staff"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const publicUser = (row) => ({
  _id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  isTwoFactorEnabled: row.isTwoFactorEnabled,
  createdAt: row.createdAt,
});

const validateName = (name) =>
  typeof name === "string" && name.trim() && name.trim().length <= 120;

exports.getUsers = async (req, res, next) => {
  try {
    const rows = orThrow(
      await supabase.from("users").select("id, name, email, role, isTwoFactorEnabled, createdAt").order("createdAt", { ascending: false })
    );
    res.json(rows.map(publicUser));
  } catch (err) {
    next(err);
  }
};

// Lets an admin read (and share) the current signup invite code.
exports.getSignupInviteCode = async (req, res, next) => {
  try {
    const inviteCode = await getInviteCode();
    res.json({ inviteCode });
  } catch (err) {
    next(err);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const nextRole = role || "staff";

    if (!validateName(name)) {
      return res.status(400).json({ message: "Name is required." });
    }
    if (typeof email !== "string" || !EMAIL_RE.test(email.trim()) || email.trim().length > 254) {
      return res.status(400).json({ message: "A valid email address is required." });
    }
    if (!ROLES.includes(nextRole)) {
      return res.status(400).json({ message: "Role must be either admin or staff." });
    }
    const pwdError = validatePasswordStrength(password);
    if (pwdError) return res.status(400).json({ message: pwdError });

    const normalizedEmail = email.trim().toLowerCase();
    const taken = orThrow(
      await supabase.from("users").select("id").eq("email", normalizedEmail).maybeSingle()
    );
    if (taken) return res.status(400).json({ message: "Email already in use" });

    const created = orThrow(
      await supabase
        .from("users")
        .insert({
          id: newId(),
          name: name.trim(),
          email: normalizedEmail,
          password: await bcrypt.hash(password, 10),
          role: nextRole,
          isTwoFactorEnabled: true,
        })
        .select("id, name, email, role, isTwoFactorEnabled, createdAt")
        .single()
    );

    // Notify the new account holder and give them an emailed OTP so they can
    // confirm the address, mirroring the self-service signup flow.
    const otpResult = await createOtp(created.id);
    const emailSend = await sendOtpEmail({
      to: created.email,
      name: created.name,
      otp: otpResult.otpCode,
      subject: "Your LaundriTrack account is ready",
      intro: `An account has been created for you as ${created.role === "admin" ? "an administrator" : "a staff member"}. Use the code below to verify your email address.`,
    });

    await logActivity({
      req,
      action: "USER_CREATED",
      resource: "users",
      resourceId: created.id,
      details: { name: created.name, email: created.email, role: created.role, emailSent: emailSend.sent },
    });

    res.status(201).json({ ...publicUser(created), emailSent: emailSend.sent, email });
  } catch (err) {
    next(err);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { name, email, role, password } = req.body;
    const existing = orThrow(
      await supabase.from("users").select("id, role").eq("id", req.params.id).maybeSingle()
    );
    if (!existing) return res.status(404).json({ message: "User not found" });

    const update = {};
    if (name !== undefined) {
      if (!validateName(name)) return res.status(400).json({ message: "Name is required." });
      update.name = name.trim();
    }
    if (email !== undefined) {
      if (typeof email !== "string" || !EMAIL_RE.test(email.trim()) || email.trim().length > 254) {
        return res.status(400).json({ message: "A valid email address is required." });
      }
      update.email = email.trim().toLowerCase();
    }
    if (role !== undefined) {
      if (!ROLES.includes(role)) {
        return res.status(400).json({ message: "Role must be either admin or staff." });
      }
      if (existing.role === "admin" && role !== "admin") {
        const admins = await count(
          supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "admin")
        );
        if (admins <= 1) {
          return res.status(400).json({ message: "Cannot demote the last remaining admin." });
        }
      }
      update.role = role;
    }
    if (password) {
      const pwdError = validatePasswordStrength(password);
      if (pwdError) return res.status(400).json({ message: pwdError });
      update.password = await bcrypt.hash(password, 10);
    }

    if (!Object.keys(update).length) {
      return res.json({ message: "No changes supplied." });
    }

    const rows = orThrow(
      await supabase
        .from("users")
        .update(update)
        .eq("id", existing.id)
        .select("id, name, email, role, isTwoFactorEnabled, createdAt")
    );
    if (!rows.length) return res.status(404).json({ message: "User not found" });

    await logActivity({
      req,
      action: "USER_UPDATED",
      resource: "users",
      resourceId: existing.id,
      details: { fields: Object.keys(update).filter((key) => key !== "password") },
    });

    res.json(publicUser(rows[0]));
  } catch (err) {
    next(err);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: "You cannot delete your own account." });
    }

    const existing = orThrow(
      await supabase.from("users").select("id, name, role").eq("id", req.params.id).maybeSingle()
    );
    if (!existing) return res.status(404).json({ message: "User not found" });

    if (existing.role === "admin") {
      const admins = await count(
        supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "admin")
      );
      if (admins <= 1) {
        return res.status(400).json({ message: "Cannot delete the last remaining admin." });
      }
    }

    orThrow(await supabase.from("users").delete().eq("id", existing.id));

    await logActivity({
      req,
      action: "USER_DELETED",
      resource: "users",
      resourceId: existing.id,
      details: { name: existing.name, role: existing.role },
    });

    res.json({ message: "User deleted" });
  } catch (err) {
    next(err);
  }
};
