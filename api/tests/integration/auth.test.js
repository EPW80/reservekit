const request = require("supertest");
const app = require("../../app");
const { truncateAll } = require("../helpers/db");
const { createUser } = require("../helpers/factories");

beforeEach(() => truncateAll());

describe("POST /api/auth/login", () => {
  it("returns 200 and a JWT token on valid credentials", async () => {
    await createUser({ email: "alice@example.com", password: "secret" });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "alice@example.com", password: "secret" });

    expect(res.status).toBe(200);
    expect(res.body.error).toBeNull();
    expect(typeof res.body.data.token).toBe("string");
    expect(res.body.data.token.split(".")).toHaveLength(3); // valid JWT structure
  });

  it("returns 401 on wrong password", async () => {
    await createUser({ email: "alice@example.com", password: "correct" });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "alice@example.com", password: "wrong" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
    expect(res.body.data).toBeNull();
  });

  it("returns 401 for an unknown email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "any" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 400 VALIDATION_ERROR when email is not valid", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "not-an-email", password: "pass" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 VALIDATION_ERROR when password is missing", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "alice@example.com" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
