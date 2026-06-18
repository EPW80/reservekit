const { validationResult } = require("express-validator");

module.exports = function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next({
      status: 400,
      code: "VALIDATION_ERROR",
      message: errors
        .array()
        .map((e) => e.msg)
        .join("; "),
    });
  }
  next();
};
