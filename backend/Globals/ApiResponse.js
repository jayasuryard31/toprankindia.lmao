const RESPONSE = require("./response");

const result = (key, responseData = null) => {
  const entry = RESPONSE[key] || RESPONSE.SERVER_ERROR;

  return {
    responseCode: entry.code,
    responseMessage: entry.message,
    responseData,
  };
};

module.exports = { result };
