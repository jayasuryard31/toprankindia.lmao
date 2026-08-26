const prisma = require("../../Config/DBConnect");
const { CATEGORIES } = require("../../Globals/constants");
const { normalizeUrl } = require("../../Utils/urlNormalizer");

// ── Repository ──────────────────────────────────────────

async function findByNormalizedUrl(normalizedUrl) {
  return prisma.product.findUnique({ where: { normalizedUrl } });
}

async function findById(id) {
  return prisma.product.findUnique({
    where: { id },
    include: { _count: { select: { bids: true } } },
  });
}

async function createProduct(data) {
  return prisma.product.create({
    data: {
      websiteUrl: data.websiteUrl,
      normalizedUrl: normalizeUrl(data.websiteUrl),
      websiteName: data.websiteName || "",
      description: data.description || "",
      logoUrl: data.logoUrl || "",
      faviconUrl: data.faviconUrl || "",
      categoryId: data.categoryId,
      currentAmount: data.currentAmount || 0,
      currency: data.currency || "INR",
      paymentStatus: data.paymentStatus || "CREATED",
      isActive: data.isActive || false,
      clickCount: 0,
      totalPayments: 0,
    },
  });
}

async function incrementClick(id) {
  return prisma.product.update({
    where: { id },
    data: { clickCount: { increment: 1 } },
  });
}

async function findActiveProducts({ categoryId, search, sort, period, page, limit }) {
  const where = { isActive: true, paymentStatus: "PAID" };

  if (categoryId) where.categoryId = Number(categoryId);

  if (search) {
    where.OR = [
      { websiteName: { contains: search, mode: "insensitive" } },
      { websiteUrl: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  if (period === "today") {
    const istOffset = 5.5 * 60 * 60 * 1000;
    const now = new Date();
    const istNow = new Date(now.getTime() + istOffset);
    const todayStart = new Date(istNow);
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayStartUTC = new Date(todayStart.getTime() - istOffset);
    where.lastRankedAt = { gte: todayStartUTC };
  }

  let orderBy;
  switch (sort) {
    case "newest":
      orderBy = [{ createdAt: "desc" }];
      break;
    case "amount":
    case "rank":
    default:
      orderBy = [{ currentAmount: "desc" }, { createdAt: "asc" }, { id: "asc" }];
      break;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [products, total] = await Promise.all([
    prisma.product.findMany({ where, orderBy, skip, take: Number(limit) }),
    prisma.product.count({ where }),
  ]);

  return {
    products,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
}

async function findTopProducts(limit) {
  return prisma.product.findMany({
    where: { isActive: true, paymentStatus: "PAID" },
    orderBy: [{ currentAmount: "desc" }, { createdAt: "asc" }, { id: "asc" }],
    take: Number(limit),
  });
}

async function getCategoryRank(productId) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return null;

  const rank = await prisma.product.count({
    where: {
      categoryId: product.categoryId,
      isActive: true,
      paymentStatus: "PAID",
      OR: [
        { currentAmount: { gt: product.currentAmount } },
        { currentAmount: product.currentAmount, createdAt: { lt: product.createdAt } },
        { currentAmount: product.currentAmount, createdAt: product.createdAt, id: { lt: product.id } },
      ],
    },
  });
  return rank + 1;
}

async function getAllTimeRank(productId) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return null;

  const rank = await prisma.product.count({
    where: {
      isActive: true,
      paymentStatus: "PAID",
      OR: [
        { currentAmount: { gt: product.currentAmount } },
        { currentAmount: product.currentAmount, createdAt: { lt: product.createdAt } },
        { currentAmount: product.currentAmount, createdAt: product.createdAt, id: { lt: product.id } },
      ],
    },
  });
  return rank + 1;
}

// ── Service ─────────────────────────────────────────────

function formatProduct(product, categoryRank, allTimeRank) {
  return {
    id: product.id,
    websiteName: product.websiteName,
    websiteUrl: product.websiteUrl,
    description: product.description,
    logoUrl: product.logoUrl,
    faviconUrl: product.faviconUrl,
    category: CATEGORIES[product.categoryId]
      ? { id: product.categoryId, name: CATEGORIES[product.categoryId].name }
      : { id: product.categoryId, name: "Unknown" },
    currentAmount: product.currentAmount,
    currency: product.currency,
    categoryRank,
    allTimeRank,
    clickCount: product.clickCount,
    totalBids: product.totalPayments,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

async function getProductById(id) {
  const product = await findById(id);
  if (!product) return null;

  const [categoryRank, allTimeRank] = await Promise.all([
    getCategoryRank(id),
    getAllTimeRank(id),
  ]);

  return formatProduct(product, categoryRank, allTimeRank);
}

async function getProducts({ categoryId, search, sort, period, page, limit }) {
  const result = await findActiveProducts({ categoryId, search, sort, period, page, limit });

  const productsWithRanks = await Promise.all(
    result.products.map(async (p) => {
      const [categoryRank, allTimeRank] = await Promise.all([
        getCategoryRank(p.id),
        getAllTimeRank(p.id),
      ]);
      return formatProduct(p, categoryRank, allTimeRank);
    })
  );

  return { products: productsWithRanks, pagination: result.pagination };
}

async function getTopProducts(limit = 3) {
  const products = await findTopProducts(limit);
  return products.map((p, i) => ({
    rank: i + 1,
    id: p.id,
    websiteName: p.websiteName,
    websiteUrl: p.websiteUrl,
    description: p.description,
    logoUrl: p.logoUrl,
    currentAmount: p.currentAmount,
    currency: p.currency,
    category: CATEGORIES[p.categoryId]
      ? { id: p.categoryId, name: CATEGORIES[p.categoryId].name }
      : { id: p.categoryId, name: "Unknown" },
  }));
}

async function trackClick(productId) {
  const product = await findById(productId);
  if (!product) return null;
  return incrementClick(productId);
}

module.exports = {
  findByNormalizedUrl,
  findById,
  createProduct,
  incrementClick,
  findActiveProducts,
  findTopProducts,
  getCategoryRank,
  getAllTimeRank,
  formatProduct,
  getProductById,
  getProducts,
  getTopProducts,
  trackClick,
};
