const { CATEGORIES } = require("../Globals/constants");
const RESPONSE = require("../Globals/response");

function validateCreateOrder(req, res, next) {
  const { websiteUrl, categoryId, amount } = req.body;
  const errors = [];

  if (!websiteUrl || typeof websiteUrl !== "string") {
    errors.push("websiteUrl is required");
  } else {
    try {
      const parsed = new URL(websiteUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        errors.push("Only http and https URLs are allowed");
      }
    } catch {
      errors.push("Invalid website URL");
    }
  }

  if (categoryId === undefined || categoryId === null) {
    errors.push("categoryId is required");
  } else if (!Number.isInteger(Number(categoryId)) || !CATEGORIES[Number(categoryId)]) {
    errors.push("Invalid categoryId");
  }

  if (amount === undefined || amount === null) {
    errors.push("amount is required");
  } else {
    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0 || !Number.isInteger(parsedAmount)) {
      errors.push("amount must be a positive integer in INR");
    }
  }

  if (errors.length > 0) {
    const entry = RESPONSE.VALIDATION_ERROR;
    return res.json({
      responseCode: entry.code,
      responseMessage: errors.join(", "),
      responseData: null,
    });
  }

  req.body.categoryId = Number(categoryId);
  req.body.amount = Number(amount);
  next();
}

function validateVerifyPayment(req, res, next) {
  const razorpayOrderId = req.body?.razorpayOrderId || req.body?.razorpay_order_id;
  const razorpayPaymentId = req.body?.razorpayPaymentId || req.body?.razorpay_payment_id;
  const razorpaySignature = req.body?.razorpaySignature || req.body?.razorpay_signature;
  const errors = [];

  if (!razorpayOrderId) errors.push("razorpayOrderId (or razorpay_order_id) is required");
  if (!razorpayPaymentId) errors.push("razorpayPaymentId (or razorpay_payment_id) is required");
  if (!razorpaySignature) errors.push("razorpaySignature (or razorpay_signature) is required");

  if (errors.length > 0) {
    const entry = RESPONSE.VALIDATION_ERROR;
    return res.status(400).json({
      responseCode: entry.code,
      responseMessage: errors.join(", "),
      responseData: null,
    });
  }

  // Normalize onto req.body
  req.body.razorpayOrderId = razorpayOrderId;
  req.body.razorpayPaymentId = razorpayPaymentId;
  req.body.razorpaySignature = razorpaySignature;

  next();
}

module.exports = { validateCreateOrder, validateVerifyPayment };
