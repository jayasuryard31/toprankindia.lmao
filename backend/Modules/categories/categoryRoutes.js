const express = require("express");
const router = express.Router();
const categoryService = require("./categoryService");
const ApiResponse = require("../../Globals/ApiResponse");

router.get("/", async (req, res) => {
  try {
    const categories = await categoryService.getAllCategories();
    return res.json(ApiResponse.result("SUCCESS", categories));
  } catch (err) {
    console.error("[Categories] Error:", err);
    return res.json(ApiResponse.result("SERVER_ERROR"));
  }
});

module.exports = router;
