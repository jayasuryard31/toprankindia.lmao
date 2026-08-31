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

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Robust origin parsing supporting strings, JSON arrays, quotes, and whitespace
function parseAllowedOrigins() {
  const envVal = process.env.FRONTEND_URLS || process.env.FRONTEND_URL || "";
  const parsed = envVal
    .replace(/[\[\]'"]/g, "") // strip brackets and all quotes
    .split(",")
    .map((u) => u.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  const defaults = [
    "https://www.toprankplots.lol",
    "https://toprankplots.lol",
    "https://toprankindia.vercel.app",
    "https://toprankindia-lmao.vercel.app",
  ];

  return Array.from(new Set([...defaults, ...parsed]));
}

const allowedOrigins = parseAllowedOrigins();

function isOriginAllowed(origin) {
  if (!origin) return true;
  const normalized = origin.trim().replace(/\/+$/, "");

  // Whitelist check
  if (allowedOrigins.includes(normalized)) return true;

  // Localhost / 127.0.0.1 on any port
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized)) return true;

  // Any subdomain of toprankplots.lol
  if (/^https:\/\/(?:[a-zA-Z0-9-]+\.)*toprankplots\.lol$/.test(normalized)) return true;

  // Any Vercel deployment for toprank
  if (/^https:\/\/(?:[a-zA-Z0-9-]+-)*toprank[a-zA-Z0-9-]*\.vercel\.app$/.test(normalized)) return true;
  if (/^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/.test(normalized)) return true;

  return false;
}

const corsOptions = {
  origin(origin, cb) {
    if (isOriginAllowed(origin)) {
      return cb(null, true);
    }
    console.warn(`[CORS] Blocked origin: ${origin}`);
    return cb(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-admin-code",
    "x-razorpay-signature",
    "Accept",
    "Origin",
    "X-Requested-With",
  ],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  optionsSuccessStatus: 200,
  preflightContinue: false,
};

// Apply CORS globally before rate limiters and body parsers
app.use(cors(corsOptions));
app.options(/(.*)/, cors(corsOptions));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS",
  message: {
    success: false,
    error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." },
  },
});

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS",
  message: {
    success: false,
    error: { code: "RATE_LIMITED", message: "Too many payment requests. Please try again later." },
  },
});

app.use("/api", apiLimiter);
app.use("/api/payments", paymentLimiter);

// Parse JSON while capturing raw body for webhook verification
app.use(
  express.json({
    limit: "1mb",
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

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
