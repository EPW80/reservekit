const request = require("supertest");
const app = require("../../app");

describe("security middleware", () => {
  it("sets helmet hardening headers and hides x-powered-by", async () => {
    const res = await request(app).get("/api/events");

    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("reflects an allowed Origin in the CORS header", async () => {
    const res = await request(app).get("/api/events").set("Origin", "http://localhost:5173");

    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });

  it("does not emit a CORS header for a disallowed Origin", async () => {
    const res = await request(app).get("/api/events").set("Origin", "http://evil.example.com");

    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("rejects an oversized JSON body with 413", async () => {
    const huge = { blob: "x".repeat(20 * 1024) }; // 20 KB > 10 KB limit
    const res = await request(app).post("/api/auth/login").send(huge);

    expect(res.status).toBe(413);
  });
});
