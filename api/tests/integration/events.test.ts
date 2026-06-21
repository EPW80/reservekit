import request from "supertest";
import app from "../../app";
import { truncateAll, db } from "../helpers/db";
import { createUser, createEvent, createTier, makeToken } from "../helpers/factories";

let adminId: any, adminToken: any;

beforeEach(async () => {
  await truncateAll();
  const admin = await createUser({ email: "admin@example.com", role: "admin" });
  adminId = admin.id;
  adminToken = makeToken({ sub: admin.id, email: admin.email, role: "admin" });
});

// ── GET /api/events ───────────────────────────────────────────────────────────

describe("GET /api/events", () => {
  it("returns an empty array when there are no events", async () => {
    const res = await request(app).get("/api/events");

    expect(res.status).toBe(200);
    expect(res.body.error).toBeNull();
    expect(res.body.data).toEqual([]);
  });

  it("returns active events ordered by date", async () => {
    await createEvent({
      title: "Later",
      date: "2027-09-01",
      createdBy: adminId,
    });
    await createEvent({
      title: "Earlier",
      date: "2027-03-01",
      createdBy: adminId,
    });

    const res = await request(app).get("/api/events");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].title).toBe("Earlier");
    expect(res.body.data[1].title).toBe("Later");
  });

  it("does not return archived events", async () => {
    const event = await createEvent({ title: "Archived", createdBy: adminId });
    await db.query(`UPDATE events SET status = 'archived' WHERE id = $1`, [event.id]);

    const res = await request(app).get("/api/events");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it("response objects include expected fields", async () => {
    await createEvent({
      title: "Shape Test",
      location: "Arena",
      createdBy: adminId,
    });

    const res = await request(app).get("/api/events");
    const evt = res.body.data[0];

    expect(evt).toHaveProperty("id");
    expect(evt).toHaveProperty("title", "Shape Test");
    expect(evt).toHaveProperty("location", "Arena");
    expect(evt).toHaveProperty("status", "active");
    expect(evt).not.toHaveProperty("password_hash"); // never leaks user data
  });
});

// ── GET /api/events/:id/tiers ─────────────────────────────────────────────────

describe("GET /api/events/:id/tiers", () => {
  it("returns tiers sorted by price ascending", async () => {
    const event = await createEvent({ createdBy: adminId });
    await createTier({
      eventId: event.id,
      name: "VIP",
      price: 50,
      capacity: 20,
    });
    await createTier({
      eventId: event.id,
      name: "General",
      price: 10,
      capacity: 100,
    });

    const res = await request(app).get(`/api/events/${event.id}/tiers`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].name).toBe("General");
    expect(res.body.data[1].name).toBe("VIP");
  });

  it("returns an empty array for an event with no tiers", async () => {
    const event = await createEvent({ createdBy: adminId });

    const res = await request(app).get(`/api/events/${event.id}/tiers`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("returns 404 NOT_FOUND for a non-existent event", async () => {
    const res = await request(app).get("/api/events/999999/tiers");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 400 VALIDATION_ERROR for a non-integer id", async () => {
    const res = await request(app).get("/api/events/not-an-id/tiers");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("tier objects include capacity and sold_count", async () => {
    const event = await createEvent({ createdBy: adminId });
    await createTier({
      eventId: event.id,
      name: "General",
      price: 10,
      capacity: 50,
      soldCount: 5,
    });

    const res = await request(app).get(`/api/events/${event.id}/tiers`);
    const tier = res.body.data[0];

    expect(tier.capacity).toBe(50);
    expect(tier.sold_count).toBe(5);
  });
});

// ── GET /api/events/:id ───────────────────────────────────────────────────────

describe("GET /api/events/:id", () => {
  it("returns the event by id", async () => {
    const event = await createEvent({
      title: "Solo Event",
      createdBy: adminId,
    });

    const res = await request(app).get(`/api/events/${event.id}`);

    expect(res.status).toBe(200);
    expect(res.body.error).toBeNull();
    expect(res.body.data.id).toBe(event.id);
    expect(res.body.data.title).toBe("Solo Event");
  });

  it("returns 404 for a non-existent event", async () => {
    const res = await request(app).get("/api/events/999999");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 400 for a non-integer id", async () => {
    const res = await request(app).get("/api/events/abc");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

// ── POST /api/events ──────────────────────────────────────────────────────────

describe("POST /api/events", () => {
  it("returns 201 and the new event for an admin", async () => {
    const res = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${adminToken}`)
      .field("title", "New Event")
      .field("date", "2027-08-01T18:00:00Z")
      .field("location", "Main Hall");

    expect(res.status).toBe(201);
    expect(res.body.error).toBeNull();
    expect(res.body.data.title).toBe("New Event");
    expect(res.body.data.location).toBe("Main Hall");
    expect(res.body.data.created_by).toBe(adminId);
  });

  it("returns 400 when title is missing", async () => {
    const res = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${adminToken}`)
      .field("date", "2027-08-01T18:00:00Z")
      .field("location", "Main Hall");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when date is not ISO 8601", async () => {
    const res = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${adminToken}`)
      .field("title", "Bad Date")
      .field("date", "not-a-date")
      .field("location", "Somewhere");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when location is missing", async () => {
    const res = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${adminToken}`)
      .field("title", "No Location")
      .field("date", "2027-08-01T18:00:00Z");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 401 without a token", async () => {
    const res = await request(app)
      .post("/api/events")
      .field("title", "Unauth")
      .field("date", "2027-08-01T18:00:00Z")
      .field("location", "Nowhere");

    expect(res.status).toBe(401);
  });

  it("returns 403 for a non-admin user", async () => {
    const user = await createUser({
      email: "nonadmin@example.com",
      role: "user",
    });
    const token = makeToken({ sub: user.id, email: user.email, role: "user" });

    const res = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${token}`)
      .field("title", "Forbidden")
      .field("date", "2027-08-01T18:00:00Z")
      .field("location", "Anywhere");

    expect(res.status).toBe(403);
  });
});

// ── PATCH /api/events/:id ─────────────────────────────────────────────────────

describe("PATCH /api/events/:id", () => {
  it("updates event fields", async () => {
    const event = await createEvent({ title: "Original", createdBy: adminId });

    const res = await request(app)
      .patch(`/api/events/${event.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "Updated" });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Updated");
  });

  it("preserves unchanged fields when patching a single field", async () => {
    const event = await createEvent({
      title: "Original",
      location: "Hall A",
      createdBy: adminId,
    });

    const res = await request(app)
      .patch(`/api/events/${event.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "Updated" });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Updated");
    expect(res.body.data.location).toBe("Hall A");
  });

  it("updates multiple fields at once", async () => {
    const event = await createEvent({ title: "Old Title", createdBy: adminId });

    const res = await request(app)
      .patch(`/api/events/${event.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "New Title", location: "New Venue" });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("New Title");
    expect(res.body.data.location).toBe("New Venue");
  });

  it("ignores created_by in patch body", async () => {
    const event = await createEvent({ title: "Protected", createdBy: adminId });

    const res = await request(app)
      .patch(`/api/events/${event.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "Changed", created_by: 9999 });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Changed");
    expect(res.body.data.created_by).toBe(adminId);
  });

  it("returns 404 for a non-existent event", async () => {
    const res = await request(app)
      .patch("/api/events/999999")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "Ghost" });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 401 without a token", async () => {
    const event = await createEvent({ createdBy: adminId });

    const res = await request(app).patch(`/api/events/${event.id}`).send({ title: "Nope" });

    expect(res.status).toBe(401);
  });

  it("returns 403 for a non-admin user", async () => {
    const user = await createUser({ email: "usr@example.com", role: "user" });
    const token = makeToken({ sub: user.id, email: user.email, role: "user" });
    const event = await createEvent({ createdBy: adminId });

    const res = await request(app)
      .patch(`/api/events/${event.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Nope" });

    expect(res.status).toBe(403);
  });
});

// ── DELETE /api/events/:id ────────────────────────────────────────────────────

describe("DELETE /api/events/:id", () => {
  it("soft-deletes the event by setting status to archived", async () => {
    const event = await createEvent({ createdBy: adminId });

    const res = await request(app)
      .delete(`/api/events/${event.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("archived");
  });

  it("archived event no longer appears in GET /api/events", async () => {
    const event = await createEvent({ createdBy: adminId });

    await request(app)
      .delete(`/api/events/${event.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    const list = await request(app).get("/api/events");
    expect(list.body.data.find((e: any) => e.id === event.id)).toBeUndefined();
  });

  it("returns 404 for a non-existent event", async () => {
    const res = await request(app)
      .delete("/api/events/999999")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 401 without a token", async () => {
    const event = await createEvent({ createdBy: adminId });

    const res = await request(app).delete(`/api/events/${event.id}`);

    expect(res.status).toBe(401);
  });

  it("returns 403 for a non-admin user", async () => {
    const user = await createUser({ email: "basic@example.com", role: "user" });
    const token = makeToken({ sub: user.id, email: user.email, role: "user" });
    const event = await createEvent({ createdBy: adminId });

    const res = await request(app)
      .delete(`/api/events/${event.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});
