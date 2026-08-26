function errorHandler(err, req, res, _next) {
  console.error(`[ERROR] ${req.method} ${req.url}:`, err.message);
  if (process.env.NODE_ENV !== "production") {
    console.error(err.stack);
  }

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      error: { code: "INVALID_JSON", message: "Invalid JSON in request body" },
    });
  }

  if (err.statusCode === 429) {
    return res.status(429).json({
      success: false,
      error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." },
    });
  }

  return res.status(500).json({
    success: false,
    error: {
      code: "SERVER_ERROR",
      message: process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : err.message,
    },
  });
}

module.exports = { errorHandler };
