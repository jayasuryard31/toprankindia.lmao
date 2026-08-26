const prisma = require("../../Config/DBConnect");

async function getStats() {
  const [paymentStats, productStats, categoryCount] = await Promise.all([
    prisma.payment.aggregate({
      where: { status: "PAID" },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.product.aggregate({
      where: { isActive: true, paymentStatus: "PAID" },
      _count: { id: true },
    }),
    prisma.product.groupBy({
      by: ["categoryId"],
      where: { isActive: true, paymentStatus: "PAID" },
    }),
  ]);

  return {
    totalCollected: paymentStats._sum.amount || 0,
    currency: "INR",
    totalProducts: productStats._count.id || 0,
    totalPayments: paymentStats._count.id || 0,
    totalCategories: categoryCount.length,
    activeProducts: productStats._count.id || 0,
  };
}

async function getTotalCollected() {
  const result = await prisma.payment.aggregate({
    where: { status: "PAID" },
    _sum: { amount: true },
  });
  return { totalAmount: result._sum.amount || 0, currency: "INR" };
}

module.exports = { getStats, getTotalCollected };
