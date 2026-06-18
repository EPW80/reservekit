const js = require("@eslint/js");
const globals = require("globals");

// Root ESLint config for the Node/CommonJS code in api/ and db/.
// The client has its own flat config at client/eslint.config.js.
module.exports = [
  {
    ignores: ["client/**", "node_modules/**", "coverage/**", "skills-main/**", ".claude/**"],
  },
  js.configs.recommended,
  {
    files: ["api/**/*.js", "db/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: { ...globals.node },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-var": "error",
      "prefer-const": "error",
      eqeqeq: ["error", "smart"],
    },
  },
  {
    files: ["api/tests/**/*.js"],
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
    },
  },
  {
    // Root-level Node config files (jest.config.js, eslint.config.js, …)
    files: ["**/*.config.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { ...globals.node },
    },
  },
  {
    // WordPress plugin runs in the browser
    files: ["wp-plugin/**/*.js"],
    languageOptions: {
      sourceType: "script",
      globals: { ...globals.browser },
    },
  },
];
