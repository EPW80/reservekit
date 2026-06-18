const multer = require("multer");

const CODE_STATUS = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL: 500,
};

// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    return res
      .status(400)
      .json({ data: null, error: { code: "VALIDATION_ERROR", message: err.message } });
  }

  const isDev = process.env.NODE_ENV === "development";
  const code = err.code || "INTERNAL";
  const status = err.status || CODE_STATUS[code] || 500;

  // For unexpected (500) errors, log the full error but never leak internals
  // (e.g. Postgres constraint messages) to the client outside development.
  let message;
  if (status === 500) {
    console.error(err);
    message = isDev ? err.message : "An unexpected error occurred";
  } else {
    message = err.message || "An unexpected error occurred";
  }

  const error = { code, message };
  if (isDev && err.stack) error.stack = err.stack;

  res.status(status).json({ data: null, error });
};
