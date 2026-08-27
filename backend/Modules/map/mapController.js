const mapService = require("./mapService");
const billboardService = require("./billboardService");
const ApiResponse = require("../../Globals/ApiResponse");

async function getCity(req, res) {
  try {
    return res.json(ApiResponse.result("SUCCESS", mapService.getCityLayout()));
  } catch (err) {
    console.error("[Map] City layout error:", err);
    return res.json(ApiResponse.result("SERVER_ERROR"));
  }
}

async function getBillboards(req, res) {
  try {
    const list = await billboardService.getAllBillboards();
    return res.json(ApiResponse.result("SUCCESS", list));
  } catch (err) {
    console.error("[Map] Get billboards error:", err);
    return res.json(ApiResponse.result("SERVER_ERROR"));
  }
}

async function bookBillboard(req, res) {
  try {
    const body = req.body || {};
    const billboardNumber = body.billboardNumber || body.slotNumber;
    const code = body.code || body.billboardId;
    const websiteUrl = body.websiteUrl || body.url || body.brandData?.websiteUrl;
    const brandName = body.brandName || body.brandData?.websiteName || body.brandData?.brandName;

    if (!websiteUrl || !brandName) {
      return res.json(ApiResponse.result("VALIDATION_ERROR", null, "Missing websiteUrl or brandName"));
    }

    const billboard = await billboardService.bookBillboard({
      billboardNumber,
      code,
      websiteUrl,
      brandName,
      tagline: body.tagline || body.brandData?.tagline,
      description: body.description || body.brandData?.description,
      logoUrl: body.logoUrl || body.brandData?.logoUrl,
      faviconUrl: body.faviconUrl || body.brandData?.faviconUrl,
      categoryName: body.categoryName || body.category?.name || body.brandData?.category?.name,
      color: body.color || body.brandData?.color,
      months: body.months || 1,
      razorpayOrderId: body.razorpayOrderId,
      razorpayPaymentId: body.razorpayPaymentId,
      razorpaySignature: body.razorpaySignature,
    });

    return res.json(ApiResponse.result("SUCCESS", billboard));
  } catch (err) {
    console.error("[Map] Book billboard error:", err);
    return res.json(ApiResponse.result("SERVER_ERROR"));
  }
}

module.exports = {
  getCity,
  getBillboards,
  bookBillboard,
  claimBillboard: bookBillboard, // alias
};
