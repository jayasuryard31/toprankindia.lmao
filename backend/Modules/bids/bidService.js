const prisma = require("../../Config/DBConnect");

// ── Repository ──────────────────────────────────────────

async function createBid(data) {
  return prisma.bid.create({
    data: {
      productId: data.productId,
      amount: data.amount,
      currency: data.currency || "INR",
      razorpayOrderId: data.razorpayOrderId,
      razorpayPaymentId: data.razorpayPaymentId || null,
      status: data.status || "CREATED",
    },
  });
}

async function updateStatus(razorpayOrderId, status, razorpayPaymentId) {
  return prisma.bid.updateMany({
    where: { razorpayOrderId },
    data: { status, ...(razorpayPaymentId && { razorpayPaymentId }) },
  });
}

// ── Service ─────────────────────────────────────────────

async function markPaid(razorpayOrderId, razorpayPaymentId) {
  return updateStatus(razorpayOrderId, "PAID", razorpayPaymentId);
}

async function markFailed(razorpayOrderId) {
  return updateStatus(razorpayOrderId, "FAILED");
}

module.exports = { createBid, markPaid, markFailed };
