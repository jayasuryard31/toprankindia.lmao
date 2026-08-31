const crypto = require("crypto");
const paymentService = require("./paymentService");
const ApiResponse = require("../../Globals/ApiResponse");
const { CATEGORIES } = require("../../Globals/constants");

async function createOrder(req, res) {
  try {
    const { websiteUrl, categoryId, amount } = req.body;
    const result = await paymentService.createOrder(websiteUrl, categoryId, amount);
    return res.json(ApiResponse.result("SUCCESS", result));
  } catch (err) {
    console.error("[Payment] Create order error:", err);
    return res.json(ApiResponse.result("SERVER_ERROR"));
  }
}

async function verifyPayment(req, res) {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const result = await paymentService.verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature);

    const product = result.product;
    return res.json(ApiResponse.result("SUCCESS", {
      product: {
        id: product.id,
        websiteName: product.websiteName,
        websiteUrl: product.websiteUrl,
        description: product.description,
        logoUrl: product.logoUrl,
        category: CATEGORIES[product.categoryId]
          ? { id: product.categoryId, name: CATEGORIES[product.categoryId].name }
          : { id: product.categoryId, name: "Unknown" },
        currentAmount: product.currentAmount,
        currency: product.currency,
        categoryRank: result.categoryRank,
        allTimeRank: result.allTimeRank,
      },
    }));
  } catch (err) {
    console.error("[Payment] Verify error:", err);
    return res.json(ApiResponse.result("PAYMENT_FAILED", { message: err.message }));
  }
}

async function webhook(req, res) {
  try {
    const razorpaySignature = req.headers["x-razorpay-signature"];
    const event = req.body?.event;

    if (!event) return res.status(400).json(ApiResponse.result("BAD_REQUEST", { message: "Missing event" }));

    if (process.env.RAZORPAY_WEBHOOK_SECRET) {
      if (!razorpaySignature) {
        return res.status(400).json(ApiResponse.result("BAD_REQUEST", { message: "Missing webhook signature header" }));
      }

      const payload = req.rawBody || JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(payload)
        .digest("hex");

      const expectedBuf = Buffer.from(expectedSignature, "utf8");
      const signatureBuf = Buffer.from(razorpaySignature, "utf8");

      if (expectedBuf.length !== signatureBuf.length || !crypto.timingSafeEqual(expectedBuf, signatureBuf)) {
        console.warn("[Payment] Invalid webhook signature received");
        return res.status(400).json(ApiResponse.result("BAD_REQUEST", { message: "Invalid webhook signature" }));
      }
    }

    await paymentService.handleWebhook(event, req.body?.payload);
    return res.json(ApiResponse.result("SUCCESS", { status: "ok" }));
  } catch (err) {
    console.error("[Payment] Webhook error:", err);
    return res.json(ApiResponse.result("SUCCESS", { status: "ok" }));
  }
}

module.exports = { createOrder, verifyPayment, webhook };
