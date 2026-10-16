const jwt = require("jsonwebtoken");

// Must run after `protect` so req.user is present. Rejects with 403 (never 401)
// so the frontend's 401 interceptor does not treat it as an expired session and log the user out.
const requireActionReauth = (req, res, next) => {
  const token = req.headers["x-action-reauth"];
  if (!token) {
    return res.status(403).json({
      message: "Re-authentication required for this action.",
      code: "REAUTH_REQUIRED",
    });
  }

  try {
    const decoded = jwt.verify(String(token), process.env.JWT_SECRET);
    if (decoded.purpose !== "action-reauth" || decoded.id !== req.user?.id) {
      return res.status(403).json({
        message: "Re-authentication token is invalid for this user.",
        code: "REAUTH_REQUIRED",
      });
    }
    req.reauth = { verifiedAt: new Date().toISOString() };
    return next();
  } catch {
    return res.status(403).json({
      message: "Re-authentication expired. Please verify your identity again.",
      code: "REAUTH_REQUIRED",
    });
  }
};

module.exports = requireActionReauth;
