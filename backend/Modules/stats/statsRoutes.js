const express = require("express");
const router = express.Router();
const statsService = require("./statsService");
const ApiResponse = require("../../Globals/ApiResponse");

router.get("/total-collected", async (req, res) => {
  try {
    const stats = await statsService.getTotalCollected();
    return res.json(ApiResponse.result("SUCCESS", stats));
  } catch (err) {
    console.error("[Stats] Total collected error:", err);
    return res.json(ApiResponse.result("SERVER_ERROR"));
  }
});

router.get("/", async (req, res) => {
  try {
    const stats = await statsService.getStats();
    return res.json(ApiResponse.result("SUCCESS", stats));
  } catch (err) {
    console.error("[Stats] Error:", err);
    return res.json(ApiResponse.result("SERVER_ERROR"));
  }
});

module.exports = router;
