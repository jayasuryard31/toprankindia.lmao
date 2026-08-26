const productService = require("./productService");
const ApiResponse = require("../../Globals/ApiResponse");

async function getProducts(req, res) {
  try {
    const { page = 1, limit = 20, categoryId, search, sort = "rank", period = "all" } = req.query;

    const result = await productService.getProducts({
      categoryId, search, sort, period,
      page: Number(page) || 1,
      limit: Math.min(Number(limit) || 20, 100),
    });

    return res.json(ApiResponse.result("SUCCESS", { data: result.products, pagination: result.pagination }));
  } catch (err) {
    console.error("[Products] Error:", err);
    return res.json(ApiResponse.result("SERVER_ERROR"));
  }
}

async function getTopProducts(req, res) {
  try {
    const limit = Math.min(Number(req.query.limit) || 3, 20);
    const products = await productService.getTopProducts(limit);
    return res.json(ApiResponse.result("SUCCESS", products));
  } catch (err) {
    console.error("[Products] Top error:", err);
    return res.json(ApiResponse.result("SERVER_ERROR"));
  }
}

async function getProductById(req, res) {
  try {
    const product = await productService.getProductById(req.params.id);
    if (!product) return res.json(ApiResponse.result("NOT_FOUND"));
    return res.json(ApiResponse.result("SUCCESS", product));
  } catch (err) {
    console.error("[Products] Detail error:", err);
    return res.json(ApiResponse.result("SERVER_ERROR"));
  }
}

async function trackClick(req, res) {
  try {
    const product = await productService.trackClick(req.params.id);
    if (!product) return res.json(ApiResponse.result("NOT_FOUND"));
    return res.json(ApiResponse.result("SUCCESS", { clickCount: product.clickCount }));
  } catch (err) {
    console.error("[Products] Click error:", err);
    return res.json(ApiResponse.result("SERVER_ERROR"));
  }
}

module.exports = { getProducts, getTopProducts, getProductById, trackClick };
