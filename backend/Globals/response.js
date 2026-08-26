const RESPONSE = {
  SUCCESS: {
    code: 1000,
    message: "Success"
  },
  CREATED: {
    code: 1001,
    message: "Created successfully"
  },
  BAD_REQUEST: {
    code: 1002,
    message: "Bad request"
  },
  VALIDATION_ERROR: {
    code: 1003,
    message: "Validation failed"
  },
  UNAUTHORIZED: {
    code: 1004,
    message: "Unauthorized"
  },
  FORBIDDEN: {
    code: 1005,
    message: "Forbidden"
  },
  NOT_FOUND: {
    code: 1006,
    message: "Resource not found"
  },
  SERVER_ERROR: {
    code: 1007,
    message: "Something went wrong"
  },
};

module.exports = RESPONSE;
