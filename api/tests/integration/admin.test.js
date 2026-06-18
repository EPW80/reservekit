const request = require("supertest");
const app = require("../../app");
const { truncateAll, db } = require("../helpers/db");
const { createUser, createEvent, createTier, makeToken } = require("../helpers/factories");

let adminUser, adminToken, staffUser, staffToken, normalUser, userToken;
let event, tier;

beforeEach(async () => {
  await truncateAll();
  adminUser = await createUser({ email: "admin@example.com", role: "admin" });
  staffUser = await createUser({ email: "staff@example.com", role: "staff" });
  normalUser = await createUser({ email: "user@example.com", role: "user" });
  adminToken = makeToken({
    sub: adminUser.id,
    email: adminUser.email,
    role: "admin",
  });
  staffToken = makeToken({
    sub: staffUser.id,
    email: staffUser.email,
    role: "staff",
  });
  userToken = makeToken({
    sub: normalUser.id,
    email: normalUser.email,
    role: "user",
  });
  event = await createEvent({ title: "Test Event", createdBy: adminUser.id });
  tier = await createTier({
    eventId: event.id,
    name: "General",
    price: 25,
    capacity: 100,
  });
});

// ── GET /api/admin/events/:id/checkins ────────────────────────────────────────

describe("GET /api/admin/events/:id/checkins", () => {
  it("returns an empty array when there are no checkins", async () => {
    const res = await request(app)
      .get(`/api/admin/events/${event.id}/checkins`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.error).toBeNull();
    expect(res.body.data).toEqual([]);
  });

  it("returns checkins for the event", async () => {
    // create a reservation and check it in
    const {
      rows: [reservation],
    } = await db.query(
      `INSERT INTO reservations (user_id, event_id, tier_id, qr_code)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [normalUser.id, event.id, tier.id, "qr-admin-test"],
    );
    await db.query(`INSERT INTO checkins (reservation_id, staff_id) VALUES ($1, $2)`, [
      reservation.id,
      staffUser.id,
    ]);

    const res = await request(app)
      .get(`/api/admin/events/${event.id}/checkins`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toHaveProperty("attendee_email", "user@example.com");
    expect(res.body.data[0]).toHaveProperty("staff_email", "staff@example.com");
    expect(res.body.data[0]).toHaveProperty("tier_name", "General");
  });

  it("returns 404 for a non-existent event", async () => {
    const res = await request(app)
      .get("/api/admin/events/999999/checkins")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 401 without a token", async () => {
    const res = await request(app).get(`/api/admin/events/${event.id}/checkins`);

    expect(res.status).toBe(401);
  });

  it("returns 403 for a non-admin user", async () => {
    const res = await request(app)
      .get(`/api/admin/events/${event.id}/checkins`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });
});

// ── GET /api/admin/export ─────────────────────────────────────────────────────

describe("GET /api/admin/export", () => {
  it("returns CSV with header only when no reservations exist", async () => {
    const res = await request(app)
      .get("/api/admin/export")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/csv/);
    expect(res.text).toBe("name,email,event,tier,status,checked_in\n");
  });

  it("returns CSV rows for all reservations", async () => {
    await db.query(
      `INSERT INTO reservations (user_id, event_id, tier_id, qr_code)
       VALUES ($1, $2, $3, $4)`,
      [normalUser.id, event.id, tier.id, "qr-export-1"],
    );

    const res = await request(app)
      .get("/api/admin/export")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.text).toContain("user@example.com");
    expect(res.text).toContain("Test Event");
  });

  it("filters by event_id when provided", async () => {
    const other = await createEvent({
      title: "Other",
      createdBy: adminUser.id,
    });
    const otherTier = await createTier({
      eventId: other.id,
      name: "VIP",
      price: 50,
      capacity: 50,
    });

    await db.query(
      `INSERT INTO reservations (user_id, event_id, tier_id, qr_code) VALUES ($1, $2, $3, $4), ($1, $5, $6, $7)`,
      [normalUser.id, event.id, tier.id, "qr-e1", other.id, otherTier.id, "qr-e2"],
    );

    const res = await request(app)
      .get(`/api/admin/export?event_id=${event.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.text).toContain("Test Event");
    expect(res.text).not.toContain("Other");
  });

  it("returns 401 without a token", async () => {
    const res = await request(app).get("/api/admin/export");
    expect(res.status).toBe(401);
  });

  it("returns 403 for a non-admin user", async () => {
    const res = await request(app)
      .get("/api/admin/export")
      .set("Authorization", `Bearer ${staffToken}`);

    expect(res.status).toBe(403);
  });

  it("renders checked-in status correctly in CSV", async () => {
    await db.query(
      `INSERT INTO reservations (user_id, event_id, tier_id, qr_code) VALUES ($1, $2, $3, $4)`,
      [normalUser.id, event.id, tier.id, "qr-status-test"],
    );
    // check in the reservation
    const {
      rows: [reservation],
    } = await db.query(`SELECT id FROM reservations WHERE qr_code = 'qr-status-test'`);
    await db.query(`INSERT INTO checkins (reservation_id, staff_id) VALUES ($1, $2)`, [
      reservation.id,
      staffUser.id,
    ]);

    const res = await request(app)
      .get("/api/admin/export")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.text).toContain('"yes"');
  });

  it("escapes double quotes in CSV fields", async () => {
    const quoteyUser = await createUser({
      email: "quotey@example.com",
      name: 'John "JD" Doe',
    });
    await db.query(
      `INSERT INTO reservations (user_id, event_id, tier_id, qr_code) VALUES ($1, $2, $3, $4)`,
      [quoteyUser.id, event.id, tier.id, "qr-quote-test"],
    );

    const res = await request(app)
      .get("/api/admin/export")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.text).toContain('John ""JD"" Doe');
  });

  it("returns 400 for a non-integer event_id query param", async () => {
    const res = await request(app)
      .get("/api/admin/export?event_id=abc")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });
});
