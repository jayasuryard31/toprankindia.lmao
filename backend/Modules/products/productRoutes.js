const express = require("express");
const router = express.Router();
const productController = require("./productController");

router.get("/top", productController.getTopProducts);
router.get("/", productController.getProducts);
router.get("/:id", productController.getProductById);
router.post("/:id/click", productController.trackClick);

module.exports = router;
