const { isNumber } = require("../../Utils/validators");
const ApiResponse = require("../../Globals/ApiResponse");
const additionService = require("./additionservice");

const add = async (req, res) => {
  const { a, b } = req.body;

  if (!isNumber(a) || !isNumber(b)) {
    return res.json(ApiResponse.result("VALIDATION_ERROR", "'a' and 'b' must both be numbers"));
  }

  try {
    const calculation = await additionService.addAndSave(a, b);
    return res.json(ApiResponse.result("SUCCESS", calculation));
  } catch (err) {
    return res.json(ApiResponse.result("SERVER_ERROR", err.message));
  }
};

const getHistory = async (req, res) => {
  try {
    const calculations = await additionService.listCalculations();
    return res.json(ApiResponse.result("SUCCESS", calculations));
  } catch (err) {
    return res.json(ApiResponse.result("SERVER_ERROR", err.message));
  }
};

module.exports = { add, getHistory };
