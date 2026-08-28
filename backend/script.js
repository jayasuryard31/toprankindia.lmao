require("dotenv").config();

const http = require("http");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const routeIndex = require("./routeIndex");
const { errorHandler } = require("./Middleware/errorHandler");
const ApiResponse = require("./Globals/ApiResponse");
const { setupGameSocket } = require("./Modules/game/gameSocket");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Trust reverse proxy (Render, Vercel, Cloudflare, etc.) for client IP & rate limiting
app.set("trust proxy", 1);

setupGameSocket(server);

app.use(helmet());

const rawFrontendUrls = process.env.FRONTEND_URLS || process.env.FRONTEND_URL || "";
const allowedOrigins = rawFrontendUrls
  .replace(/^\[|\]$/g, "")
  .split(",")
  .map((url) => url.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    const normalizedOrigin = origin.trim().replace(/\/+$/, "");
    if (allowedOrigins.includes(normalizedOrigin)) return cb(null, true);
    // Allow any localhost / 127.0.0.1 port during local development.
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalizedOrigin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-admin-code"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." },
  },
});

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: "RATE_LIMITED", message: "Too many payment requests. Please try again later." },
  },
});

app.use("/api", apiLimiter);
app.use("/api/payments", paymentLimiter);

app.use(express.json({ limit: "1mb" }));
app.use(express.raw({ type: "application/json" }));

app.use("/api", routeIndex);

app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/health", (req, res) => {
  res.json(ApiResponse.result("SUCCESS", { status: "ok", uptime: process.uptime() }));
});

app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
