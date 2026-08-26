const prisma = require("../../Config/DBConnect");
const statsService = require("../stats/statsService");
const productService = require("../products/productService");
const categoryService = require("../categories/categoryService");

async function getRecentActivity(limit = 10) {
  try {
    const payments = await prisma.payment.findMany({
      where: { status: "PAID" },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        product: {
          select: {
            id: true,
            websiteName: true,
            websiteUrl: true,
            categoryId: true,
            currentAmount: true,
            logoUrl: true,
          },
        },
      },
    });

    return payments.map((p) => ({
      id: p.id,
      productId: p.productId,
      websiteName: p.product?.websiteName || "Product",
      websiteUrl: p.product?.websiteUrl || "",
      amount: p.amount,
      currency: p.currency || "INR",
      createdAt: p.createdAt,
      type: "outbid",
    }));
  } catch {
    return [];
  }
}

async function getHomepageData() {
  const [stats, topProducts, categories, todayTopProducts, recentActivity] = await Promise.all([
    statsService.getStats(),
    productService.getTopProducts(10),
    categoryService.getAllCategories(),
    productService.getTopProducts(10),
    getRecentActivity(10),
  ]);

  return {
    stats: {
      totalCollected: stats.totalCollected,
      totalProducts: stats.totalProducts,
      totalPayments: stats.totalPayments,
      totalCategories: stats.totalCategories,
      activeProducts: stats.activeProducts,
    },
    topProducts,
    categories,
    todayTopProducts,
    recentActivity,
  };
}

module.exports = { getHomepageData };
