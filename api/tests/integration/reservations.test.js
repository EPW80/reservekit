const request = require("supertest");
const app = require("../../app");
const { truncateAll, db } = require("../helpers/db");
const { createUser, createEvent, createTier, makeToken } = require("../helpers/factories");

let user, adminUser, event, tier, userToken;

beforeEach(async () => {
  await truncateAll();
  adminUser = await createUser({ email: "admin@example.com", role: "admin" });
  user = await createUser({ email: "user@example.com", role: "user" });
  userToken = makeToken({ sub: user.id, email: user.email, role: user.role });
  event = await createEvent({ title: "Conference", createdBy: adminUser.id });
  tier = await createTier({
    eventId: event.id,
    name: "General",
    price: 25,
    capacity: 10,
  });
});

// ── POST /api/reservations ────────────────────────────────────────────────────

describe("POST /api/reservations", () => {
  it("returns 201 and the new reservation for an authenticated user", async () => {
    const res = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ event_id: event.id, tier_id: tier.id });

    expect(res.status).toBe(201);
    expect(res.body.error).toBeNull();
    expect(res.body.data.user_id).toBe(user.id);
    expect(res.body.data.tier_id).toBe(tier.id);
    expect(res.body.data.status).toBe("confirmed");
    expect(typeof res.body.data.qr_code).toBe("string");
  });

  it("increments tier sold_count in the database", async () => {
    await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ event_id: event.id, tier_id: tier.id });

    const { rows } = await db.query("SELECT sold_count FROM tiers WHERE id = $1", [tier.id]);
    expect(rows[0].sold_count).toBe(1);
  });

  it("returns 401 when no token is provided", async () => {
    const res = await request(app)
      .post("/api/reservations")
      .send({ event_id: event.id, tier_id: tier.id });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 for a malformed token", async () => {
    const res = await request(app)
      .post("/api/reservations")
      .set("Authorization", "Bearer not.a.jwt")
      .send({ event_id: event.id, tier_id: tier.id });

    expect(res.status).toBe(401);
  });

  it("returns 409 CONFLICT when the tier is sold out", async () => {
    const soldOutTier = await createTier({
      eventId: event.id,
      name: "Sold Out",
      price: 5,
      capacity: 1,
      soldCount: 1,
    });

    const res = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ event_id: event.id, tier_id: soldOutTier.id });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("returns 400 VALIDATION_ERROR when tier_id is missing", async () => {
    const res = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ event_id: event.id });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 VALIDATION_ERROR when tier belongs to a different event", async () => {
    const otherEvent = await createEvent({
      title: "Other",
      createdBy: adminUser.id,
    });
    const otherTier = await createTier({
      eventId: otherEvent.id,
      name: "VIP",
      price: 50,
      capacity: 20,
    });

    const res = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ event_id: event.id, tier_id: otherTier.id });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.message).toMatch(/tier does not belong/i);
  });
});

// ── GET /api/reservations/:id ─────────────────────────────────────────────────

describe("GET /api/reservations/:id", () => {
  let reservation;

  beforeEach(async () => {
    const { rows } = await db.query(
      `INSERT INTO reservations (user_id, event_id, tier_id, qr_code)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [user.id, event.id, tier.id, "test-qr-code"],
    );
    reservation = rows[0];
  });

  it("returns 200 and the reservation for the owner", async () => {
    const res = await request(app)
      .get(`/api/reservations/${reservation.id}`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(reservation.id);
    expect(res.body.data.qr_code).toBe("test-qr-code");
  });

  it("returns 200 for an admin accessing another user's reservation", async () => {
    const adminToken = makeToken({
      sub: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    });

    const res = await request(app)
      .get(`/api/reservations/${reservation.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  it("returns 403 FORBIDDEN for a different non-admin user", async () => {
    const other = await createUser({ email: "other@example.com" });
    const otherToken = makeToken({
      sub: other.id,
      email: other.email,
      role: other.role,
    });

    const res = await request(app)
      .get(`/api/reservations/${reservation.id}`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("returns 401 without a token", async () => {
    const res = await request(app).get(`/api/reservations/${reservation.id}`);

    expect(res.status).toBe(401);
  });

  it("returns 404 for a non-existent reservation", async () => {
    const res = await request(app)
      .get("/api/reservations/999999")
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

// ── GET /api/reservations/:id/qr ─────────────────────────────────────────────

describe("GET /api/reservations/:id/qr", () => {
  let reservation;

  beforeEach(async () => {
    const { rows } = await db.query(
      `INSERT INTO reservations (user_id, event_id, tier_id, qr_code)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [user.id, event.id, tier.id, "qr-payload-value"],
    );
    reservation = rows[0];
  });

  it("returns qr_code", async () => {
    const res = await request(app)
      .get(`/api/reservations/${reservation.id}/qr`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.qr_code).toBe("qr-payload-value");
  });

  it("returns 403 for a different user", async () => {
    const other = await createUser({ email: "other2@example.com" });
    const otherToken = makeToken({
      sub: other.id,
      email: other.email,
      role: other.role,
    });

    const res = await request(app)
      .get(`/api/reservations/${reservation.id}/qr`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
  });
});
