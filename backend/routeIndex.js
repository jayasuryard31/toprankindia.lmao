const express = require("express");
const router = express.Router();

const additionController = require("./Modules/additionModule/additionController");

router.post("/addition", additionController.add);
router.get("/addition/history", additionController.getHistory);

module.exports = router;
