const express = require("express");
const router = express.Router();
const paymentController = require("./paymentController");
const { validateCreateOrder, validateVerifyPayment } = require("../../Middleware/validation");

router.post("/create-order", validateCreateOrder, paymentController.createOrder);
router.post("/verify", validateVerifyPayment, paymentController.verifyPayment);
router.post("/webhook", paymentController.webhook);

module.exports = router;
