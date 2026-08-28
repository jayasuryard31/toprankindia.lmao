const express = require("express");
const router = express.Router();
const adminController = require("./adminController");
const { requireAdminSecret } = require("./adminAuth");

router.get("/stats", requireAdminSecret, adminController.getAdminStats);

module.exports = router;
