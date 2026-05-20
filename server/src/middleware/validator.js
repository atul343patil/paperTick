const { validationResult } = require("express-validator");
const ApiError = require("../utils/ApiError");

// Runs after express-validator checks and throws if any fail
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, errors.array()[0].msg);
  }
  next();
};

module.exports = validate;
