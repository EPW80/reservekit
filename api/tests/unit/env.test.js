const { validateEnv } = require("../../config/env");

const validSecret = "x".repeat(32);

describe("validateEnv", () => {
  test("passes with valid DATABASE_URL and JWT_SECRET", () => {
    expect(() =>
      validateEnv({ DATABASE_URL: "postgres://localhost/db", JWT_SECRET: validSecret }),
    ).not.toThrow();
  });

  test("throws when DATABASE_URL is missing", () => {
    expect(() => validateEnv({ JWT_SECRET: validSecret })).toThrow(/DATABASE_URL is required/);
  });

  test("throws when JWT_SECRET is missing", () => {
    expect(() => validateEnv({ DATABASE_URL: "postgres://localhost/db" })).toThrow(
      /JWT_SECRET is required/,
    );
  });

  test("throws when JWT_SECRET is too short", () => {
    expect(() =>
      validateEnv({ DATABASE_URL: "postgres://localhost/db", JWT_SECRET: "short" }),
    ).toThrow(/at least 32 characters/);
  });

  test("throws when JWT_SECRET is the placeholder", () => {
    expect(() =>
      validateEnv({
        DATABASE_URL: "postgres://localhost/db",
        JWT_SECRET: "change_me_in_production",
      }),
    ).toThrow(/placeholder/);
  });

  test("aggregates multiple errors", () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL[\s\S]*JWT_SECRET/);
  });
});
