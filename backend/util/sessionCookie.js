const crypto = require("crypto");

const COOKIE_NAME = "laundritrack_session";
const SESSION_MAX_AGE_MS = 15 * 60 * 1000;

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_MAX_AGE_MS,
});

const getSessionToken = (req) => {
  const cookies = String(req.headers.cookie || "").split(";");
  const sessionCookie = cookies.find((cookie) => cookie.trim().startsWith(`${COOKIE_NAME}=`));
  if (!sessionCookie) return null;

  try {
    return decodeURIComponent(sessionCookie.trim().slice(COOKIE_NAME.length + 1));
  } catch {
    return null;
  }
};

const sessionIdFromToken = (token) =>
  crypto.createHash("sha256").update(String(token)).digest("hex");

const sessionIdFromRequest = (req) => {
  const token = getSessionToken(req);
  return token ? sessionIdFromToken(token) : req.ip;
};

const setSessionCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, cookieOptions());
};

const clearSessionCookie = (res) => {
  const { maxAge, ...options } = cookieOptions();
  res.clearCookie(COOKIE_NAME, options);
};

module.exports = {
  getSessionToken,
  sessionIdFromToken,
  sessionIdFromRequest,
  setSessionCookie,
  clearSessionCookie,
};