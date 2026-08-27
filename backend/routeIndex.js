const express = require("express");
const router = express.Router();

const productRoutes = require("./Modules/products/productRoutes");
const paymentRoutes = require("./Modules/payments/paymentRoutes");
const categoryRoutes = require("./Modules/categories/categoryRoutes");
const statsRoutes = require("./Modules/stats/statsRoutes");
const homeRoutes = require("./Modules/home/homeRoutes");
const mapRoutes = require("./Modules/map/mapRoutes");

router.use("/products", productRoutes);
router.use("/map", mapRoutes);
router.use("/payments", paymentRoutes);
router.use("/categories", categoryRoutes);
router.use("/stats", statsRoutes);
router.use("/home", homeRoutes);

module.exports = router;
