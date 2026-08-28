const express = require("express");
const router = express.Router();
const trackController = require("./trackController");

router.post("/visit", trackController.trackVisit);

module.exports = router;
