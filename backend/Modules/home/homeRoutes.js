const express = require("express");
const router = express.Router();
const homeController = require("./homeController");
const ApiResponse = require("../../Globals/ApiResponse");

router.get("/", async (req, res) => {
  try {
    const data = await homeController.getHomepageData();
    return res.json(ApiResponse.result("SUCCESS", data));
  } catch (err) {
    console.error("[Home] Error:", err);
    return res.json(ApiResponse.result("SERVER_ERROR"));
  }
});

module.exports = router;
