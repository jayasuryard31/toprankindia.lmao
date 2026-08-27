const express = require("express");
const router = express.Router();
const mapController = require("./mapController");

router.get("/city", mapController.getCity);
router.get("/billboards", mapController.getBillboards);
router.post("/billboards/book", mapController.bookBillboard);
router.post("/billboards/claim", mapController.claimBillboard);

module.exports = router;
