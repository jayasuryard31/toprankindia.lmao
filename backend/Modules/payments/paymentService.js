const crypto = require("crypto");
const prisma = require("../../Config/DBConnect");
const { getRazorpay } = require("../../Config/razorpay");
const { CURRENCY } = require("../../Globals/constants");
const { normalizeUrl } = require("../../Utils/urlNormalizer");
const { fetchMetadata } = require("../../Utils/metadataService");
const productService = require("../products/productService");
const bidService = require("../bids/bidService");

// ── Repository ──────────────────────────────────────────

async function createPayment(data) {
  return prisma.payment.create({
    data: {
      productId: data.productId,
      razorpayOrderId: data.razorpayOrderId,
      razorpayPaymentId: data.razorpayPaymentId || null,
      razorpaySignature: data.razorpaySignature || null,
      amount: data.amount,
      currency: data.currency || "INR",
      status: data.status || "CREATED",
    },
  });
}

async function findByOrderId(razorpayOrderId) {
  return prisma.payment.findUnique({ where: { razorpayOrderId } });
}

async function findByPaymentId(razorpayPaymentId) {
  return prisma.payment.findUnique({ where: { razorpayPaymentId } });
}

async function markFailed(razorpayOrderId) {
  return prisma.payment.updateMany({
    where: { razorpayOrderId },
    data: { status: "FAILED" },
  });
}

async function getTotalCollected() {
  const result = await prisma.payment.aggregate({
    where: { status: "PAID" },
    _sum: { amount: true },
    _count: { id: true },
  });
  return {
    totalAmount: result._sum.amount || 0,
    totalPayments: result._count.id || 0,
  };
}

// ── Service ─────────────────────────────────────────────

async function createOrder(websiteUrl, categoryId, amount) {
  const razorpay = getRazorpay();

  const order = await razorpay.orders.create({
    amount: amount * 100,
    currency: CURRENCY,
    receipt: `rcpt_${Date.now()}`,
  });

  const normalized = normalizeUrl(websiteUrl);

  let product = await productService.findByNormalizedUrl(normalized);

  if (!product) {
    product = await productService.createProduct({
      websiteUrl,
      categoryId,
      currentAmount: 0,
      paymentStatus: "CREATED",
      isActive: false,
    });
  }

  await createPayment({
    productId: product.id,
    razorpayOrderId: order.id,
    amount,
    currency: CURRENCY,
    status: "CREATED",
  });

  await bidService.createBid({
    productId: product.id,
    amount,
    currency: CURRENCY,
    razorpayOrderId: order.id,
    status: "CREATED",
  });

  return { orderId: order.id, amount, currency: CURRENCY };
}

function verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
  const body = razorpayOrderId + "|" + razorpayPaymentId;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(razorpaySignature)
  );
}

async function verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
  const payment = await findByOrderId(razorpayOrderId);
  if (!payment) throw new Error("Payment record not found");

  if (payment.status === "PAID") {
    const product = await productService.findById(payment.productId);
    const categoryRank = await productService.getCategoryRank(product.id);
    const allTimeRank = await productService.getAllTimeRank(product.id);
    return { product, categoryRank, allTimeRank, alreadyProcessed: true };
  }

  if (razorpaySignature && !verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
    throw new Error("Invalid payment signature");
  }

  const productRecord = await productService.findById(payment.productId);
  if (!productRecord) throw new Error("Product not found for this payment");

  const result = await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { razorpayOrderId },
      data: { razorpayPaymentId, razorpaySignature: razorpaySignature || "", status: "PAID" },
    });

    await tx.bid.updateMany({
      where: { razorpayOrderId },
      data: { razorpayPaymentId, status: "PAID" },
    });

    const existingProduct = await productService.findByNormalizedUrl(
      normalizeUrl(productRecord.websiteUrl)
    );

    let product;

    if (existingProduct && existingProduct.id !== productRecord.id) {
      product = await tx.product.update({
        where: { id: existingProduct.id },
        data: {
          currentAmount: payment.amount,
          paymentStatus: "PAID",
          isActive: true,
          lastRankedAt: new Date(),
          totalPayments: { increment: 1 },
        },
      });
    } else {
      let metadata = { websiteName: "", description: "", logoUrl: "", faviconUrl: "" };
      try {
        metadata = await fetchMetadata(productRecord.websiteUrl);
      } catch (e) {
        console.error("[Payment] Metadata fetch failed:", e.message);
      }

      const finalName = metadata.websiteName || new URL(productRecord.websiteUrl).hostname;

      product = await tx.product.update({
        where: { id: productRecord.id },
        data: {
          websiteName: finalName,
          description: metadata.description,
          logoUrl: metadata.logoUrl,
          faviconUrl: metadata.faviconUrl,
          currentAmount: payment.amount,
          paymentStatus: "PAID",
          isActive: true,
          lastRankedAt: new Date(),
          totalPayments: { increment: 1 },
        },
      });
    }

    const categoryRank = await productService.getCategoryRank(product.id);
    const allTimeRank = await productService.getAllTimeRank(product.id);

    return { product, categoryRank, allTimeRank };
  });

  return result;
}

async function verifyPaymentFromWebhook(razorpayOrderId, razorpayPaymentId) {
  const payment = await findByOrderId(razorpayOrderId);
  if (!payment) throw new Error("Payment record not found");

  if (payment.status === "PAID") {
    const product = await productService.findById(payment.productId);
    const categoryRank = await productService.getCategoryRank(product.id);
    const allTimeRank = await productService.getAllTimeRank(product.id);
    return { product, categoryRank, allTimeRank, alreadyProcessed: true };
  }

  const productRecord = await productService.findById(payment.productId);
  if (!productRecord) throw new Error("Product not found for this payment");

  const result = await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { razorpayOrderId },
      data: { razorpayPaymentId, status: "PAID" },
    });

    await tx.bid.updateMany({
      where: { razorpayOrderId },
      data: { razorpayPaymentId, status: "PAID" },
    });

    let metadata = { websiteName: "", description: "", logoUrl: "", faviconUrl: "" };
    try {
      metadata = await fetchMetadata(productRecord.websiteUrl);
    } catch (e) {
      console.error("[Payment] Metadata fetch failed:", e.message);
    }

    const finalName = metadata.websiteName || new URL(productRecord.websiteUrl).hostname;

    const product = await tx.product.update({
      where: { id: productRecord.id },
      data: {
        websiteName: finalName,
        description: metadata.description,
        logoUrl: metadata.logoUrl,
        faviconUrl: metadata.faviconUrl,
        currentAmount: payment.amount,
        paymentStatus: "PAID",
        isActive: true,
        lastRankedAt: new Date(),
        totalPayments: { increment: 1 },
      },
    });

    const categoryRank = await productService.getCategoryRank(product.id);
    const allTimeRank = await productService.getAllTimeRank(product.id);

    return { product, categoryRank, allTimeRank };
  });

  return result;
}

async function handleWebhook(event, payload) {
  switch (event) {
    case "payment.captured": {
      const payment = payload?.payment;
      if (!payment) return;

      const existing = await findByPaymentId(payment.id);
      if (existing && existing.status === "PAID") return { duplicate: true };

      const paymentRecord = await findByOrderId(payment.order_id);
      if (!paymentRecord) return { unknown: true };
      if (paymentRecord.status === "PAID") return { duplicate: true };

      return await verifyPaymentFromWebhook(payment.order_id, payment.id);
    }
    case "payment.failed": {
      const failedPayment = payload?.payment;
      if (!failedPayment) return;

      await markFailed(failedPayment.order_id);
      await bidService.markFailed(failedPayment.order_id);
      return { failed: true };
    }
    default:
      return { unhandled: true };
  }
}

module.exports = { createOrder, verifyPayment, handleWebhook };
