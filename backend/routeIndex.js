const express = require("express");
const router = express.Router();
const { validateUrlSafety } = require("./Utils/ssrfGuard");

const productRoutes = require("./Modules/products/productRoutes");
const paymentRoutes = require("./Modules/payments/paymentRoutes");
const categoryRoutes = require("./Modules/categories/categoryRoutes");
const statsRoutes = require("./Modules/stats/statsRoutes");
const homeRoutes = require("./Modules/home/homeRoutes");
const mapRoutes = require("./Modules/map/mapRoutes");
const trackRoutes = require("./Modules/track/trackRoutes");
const adminRoutes = require("./Modules/admin/adminRoutes");

router.use("/products", productRoutes);
router.use("/map", mapRoutes);
router.use("/payments", paymentRoutes);
router.use("/categories", categoryRoutes);
router.use("/stats", statsRoutes);
router.use("/home", homeRoutes);
router.use("/track", trackRoutes);
router.use("/admin", adminRoutes);

router.get("/proxy-image", async (req, res) => {
  try {
    const targetUrl = req.query.url;
    if (!targetUrl || typeof targetUrl !== "string") {
      return res.status(400).json({ success: false, error: "Missing url parameter" });
    }

    const safety = validateUrlSafety(targetUrl);
    if (!safety.valid) {
      return res.status(400).json({ success: false, error: `Invalid URL: ${safety.reason}` });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(response.status).json({ success: false, error: "Image fetch failed" });
    }

    const contentType = response.headers.get("content-type") || "image/png";
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.send(buffer);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
