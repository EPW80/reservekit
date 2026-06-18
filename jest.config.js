require("dotenv").config();

// Always target the test database — never the development one.
// Set TEST_DATABASE_URL in your environment or .env to override the default.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || "postgres://localhost:5432/reservekit_test";
process.env.JWT_SECRET = "test-jwt-secret";

module.exports = {
  forceExit: true,

  /**
   * Two projects so unit tests never trigger a DB connection:
   *   npm test                   – runs both
   *   jest --selectProjects unit – unit only (no DB required)
   *   jest --selectProjects integration
   */
  projects: [
    {
      displayName: "unit",
      testEnvironment: "node",
      testMatch: ["<rootDir>/api/tests/unit/**/*.test.js"],
    },
    {
      displayName: "integration",
      testEnvironment: "node",
      testMatch: ["<rootDir>/api/tests/integration/**/*.test.js"],
      globalSetup: "<rootDir>/api/tests/globalSetup.js",
      globalTeardown: "<rootDir>/api/tests/globalTeardown.js",
    },
  ],
};
