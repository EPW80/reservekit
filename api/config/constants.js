// Centralized tunables. Prefer importing these over scattering magic numbers.

module.exports = {
  // Image upload
  MAX_IMAGE_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB

  // Auth
  JWT_EXPIRY: "8h",
  JWT_SECRET_MIN_LENGTH: 32,

  // Request body
  JSON_BODY_LIMIT: "10kb",

  // Rate limiting
  GLOBAL_RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  GLOBAL_RATE_LIMIT_MAX: 300, // per window per IP
  AUTH_RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  AUTH_RATE_LIMIT_MAX: 10, // login attempts per window per IP
};
