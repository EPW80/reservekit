require("dotenv").config();

// Always target the test database — never the development one.
// Set TEST_DATABASE_URL in your environment or .env to override the default.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || "postgres://localhost:5432/reservekit_test";
process.env.JWT_SECRET = "test-jwt-secret";

// Transform TypeScript sources required by the (still JS) test files. Type
// errors are caught separately by `npm run typecheck`, so ts-jest only transpiles.
const tsTransform = {
  "^.+\\.ts$": ["ts-jest", { diagnostics: false }],
};
const moduleFileExtensions = ["ts", "js", "json", "node"];

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
      testMatch: ["<rootDir>/api/tests/unit/**/*.test.ts"],
      transform: tsTransform,
      moduleFileExtensions,
    },
    {
      displayName: "integration",
      testEnvironment: "node",
      testMatch: ["<rootDir>/api/tests/integration/**/*.test.ts"],
      globalSetup: "<rootDir>/api/tests/globalSetup.ts",
      globalTeardown: "<rootDir>/api/tests/globalTeardown.ts",
      transform: tsTransform,
      moduleFileExtensions,
    },
  ],
};
