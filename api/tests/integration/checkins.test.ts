import request from "supertest";
import app from "../../app";
import { truncateAll, db } from "../helpers/db";
import { createUser, createEvent, createTier, makeToken } from "../helpers/factories";

let adminUser: any, staffUser: any, normalUser: any, staffToken: any, userToken: any;
let event: any, tier: any;

beforeEach(async () => {
  await truncateAll();
  adminUser = await createUser({ email: "admin@example.com", role: "admin" });
  staffUser = await createUser({ email: "staff@example.com", role: "staff" });
  normalUser = await createUser({ email: "user@example.com", role: "user" });
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
  event = await createEvent({ title: "Conference", createdBy: adminUser.id });
  tier = await createTier({
    eventId: event.id,
    name: "General",
    price: 25,
    capacity: 100,
  });
});

// ── POST /api/checkins ────────────────────────────────────────────────────────

describe("POST /api/checkins", () => {
  let reservation: any;

  beforeEach(async () => {
    const { rows } = await db.query(
      `INSERT INTO reservations (user_id, event_id, tier_id, qr_code)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [normalUser.id, event.id, tier.id, "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"],
    );
    reservation = rows[0];
  });

  it("returns 201 for a valid check-in by staff", async () => {
    const res = await request(app)
      .post("/api/checkins")
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ qr_code: reservation.qr_code });

    expect(res.status).toBe(201);
    expect(res.body.error).toBeNull();
    expect(res.body.data).toHaveProperty("reservation_id", reservation.id);
    expect(res.body.data).toHaveProperty("staff_id", staffUser.id);
  });

  it("updates the reservation status to checked_in", async () => {
    await request(app)
      .post("/api/checkins")
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ qr_code: reservation.qr_code });

    const { rows } = await db.query("SELECT status FROM reservations WHERE id = $1", [
      reservation.id,
    ]);
    expect(rows[0].status).toBe("checked_in");
  });

  it("returns 409 CONFLICT when already checked in", async () => {
    // first check-in
    await request(app)
      .post("/api/checkins")
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ qr_code: reservation.qr_code });

    // duplicate check-in
    const res = await request(app)
      .post("/api/checkins")
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ qr_code: reservation.qr_code });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("returns 404 for a non-existent qr_code", async () => {
    const res = await request(app)
      .post("/api/checkins")
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ qr_code: "00000000-0000-0000-0000-000000000000" });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 400 when qr_code is not a valid UUID", async () => {
    const res = await request(app)
      .post("/api/checkins")
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ qr_code: "not-a-uuid" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 401 without a token", async () => {
    const res = await request(app).post("/api/checkins").send({ qr_code: reservation.qr_code });

    expect(res.status).toBe(401);
  });

  it("returns 403 for a regular user", async () => {
    const res = await request(app)
      .post("/api/checkins")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ qr_code: reservation.qr_code });

    expect(res.status).toBe(403);
  });

  it("returns 409 CONFLICT for a cancelled reservation", async () => {
    await db.query(`UPDATE reservations SET status = 'cancelled' WHERE id = $1`, [reservation.id]);

    const res = await request(app)
      .post("/api/checkins")
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ qr_code: reservation.qr_code });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });
});
