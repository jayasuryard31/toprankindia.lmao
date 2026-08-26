require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const routeIndex = require("./routeIndex");
const { errorHandler } = require("./Middleware/errorHandler");
const ApiResponse = require("./Globals/ApiResponse");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({
  origin: [
    "https://toprankindia.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.options("*", cors());

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
