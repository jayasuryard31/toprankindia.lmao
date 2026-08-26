const statsService = require("../stats/statsService");
const productService = require("../products/productService");
const categoryService = require("../categories/categoryService");

async function getHomepageData() {
  const [stats, topProducts, categories, todayTopProducts] = await Promise.all([
    statsService.getStats(),
    productService.getTopProducts(3),
    categoryService.getAllCategories(),
    productService.getTopProducts(3),
  ]);

  return {
    stats: { totalCollected: stats.totalCollected, totalProducts: stats.totalProducts },
    topProducts,
    categories,
    todayTopProducts,
  };
}

module.exports = { getHomepageData };
