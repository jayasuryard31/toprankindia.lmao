const ApiResponse = require("../../Globals/ApiResponse");
const adminStatsService = require("./adminStatsService");

async function getAdminStats(req, res) {
  try {
    const data = await adminStatsService.getAdminStats();
    return res.json(ApiResponse.result("SUCCESS", data));
  } catch (err) {
    console.error("[Admin] getAdminStats error:", err);
    return res.status(500).json(ApiResponse.result("SERVER_ERROR"));
  }
}

module.exports = { getAdminStats };
