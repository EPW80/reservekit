const { JWT_SECRET_MIN_LENGTH } = require("./constants");

/**
 * Validate environment configuration at startup and fail fast on misconfig.
 *
 * Critical vars (the app cannot run safely without them) throw.
 * Upload vars (only needed for S3 image upload) warn but do not block boot,
 * so the API can still serve read paths in local/dev setups without AWS.
 *
 * Called from server.js — not during tests, which set their own env in
 * jest.config.js and exercise the app directly.
 */
function validateEnv(env = process.env) {
  const errors = [];

  if (!env.DATABASE_URL) {
    errors.push("DATABASE_URL is required");
  }

  if (!env.JWT_SECRET) {
    errors.push("JWT_SECRET is required");
  } else if (env.JWT_SECRET === "change_me_in_production") {
    errors.push("JWT_SECRET is still the placeholder value — set a real secret");
  } else if (env.JWT_SECRET.length < JWT_SECRET_MIN_LENGTH) {
    errors.push(
      `JWT_SECRET must be at least ${JWT_SECRET_MIN_LENGTH} characters (got ${env.JWT_SECRET.length})`,
    );
  }

  if (errors.length) {
    throw new Error(`Invalid environment configuration:\n  - ${errors.join("\n  - ")}`);
  }

  const uploadVars = ["AWS_S3_BUCKET", "AWS_REGION", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"];
  const missingUpload = uploadVars.filter((v) => !env[v]);
  if (missingUpload.length && process.env.NODE_ENV !== "test") {
    console.warn(
      `[env] Missing AWS upload vars (${missingUpload.join(", ")}) — image upload will fail until set.`,
    );
  }
}

module.exports = { validateEnv };
