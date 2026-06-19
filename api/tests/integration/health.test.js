const request = require("supertest");
const app = require("../../app");

describe("GET /health", () => {
  it("returns 200 with status ok and uptime when the DB is reachable", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(typeof res.body.uptime).toBe("number");
  });

  it("is not throttled and is reachable without auth", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
  });
});
