const prisma = require("../../Config/DBConnect");
const { CATEGORIES } = require("../../Globals/constants");

async function getAllCategories() {
  const categoryIds = Object.keys(CATEGORIES).map(Number);

  const aggregations = await prisma.product.groupBy({
    by: ["categoryId"],
    where: {
      categoryId: { in: categoryIds },
      isActive: true,
      paymentStatus: "PAID",
    },
    _count: { id: true },
    _max: { currentAmount: true },
  });

  const aggrMap = {};
  for (const aggr of aggregations) {
    aggrMap[aggr.categoryId] = {
      productCount: aggr._count.id,
      highestAmount: aggr._max.currentAmount || 0,
    };
  }

  return categoryIds.map((id) => ({
    id,
    name: CATEGORIES[id].name,
    productCount: aggrMap[id]?.productCount || 0,
    highestAmount: aggrMap[id]?.highestAmount || 0,
  }));
}

module.exports = { getAllCategories };
