const errorMiddleware = (err, req, res, next) => {
  console.error(err.stack || err.message || err);
  const status = Number(err.status || err.statusCode) || 500;
  const message = status >= 500 && process.env.NODE_ENV === "production"
    ? "Internal server error"
    : err.message || "Server Error";
  res.status(status).json({ message });
};

module.exports = errorMiddleware;