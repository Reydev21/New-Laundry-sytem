const jwt = require("jsonwebtoken");
const { getSessionToken } = require("../util/sessionCookie");

const protect = (req, res, next) => {
  const authorization = req.headers.authorization || "";
  if (authorization.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Bearer-token sessions are no longer accepted. Sign in again." });
  }

  const token = getSessionToken(req);
  if (!token) return res.status(401).json({ message: "Not authorized, no session" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = protect;