const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../../config/db");

/**
 * Insert a user. Returns the row plus the plain-text password for use in login tests.
 */
async function createUser({
  email = "user@example.com",
  password = "password123",
  name = "Test User",
  role = "user",
} = {}) {
  const passwordHash = await bcrypt.hash(password, 1); // cost 1 — fast in tests
  const { rows } = await db.query(
    `INSERT INTO users (email, password_hash, name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, name, role`,
    [email, passwordHash, name, role],
  );
  return { ...rows[0], password };
}

/**
 * Insert an event. createdBy must be a valid user id.
 */
async function createEvent({
  title = "Test Event",
  description = null,
  date = "2027-06-01T18:00:00Z",
  location = "Test Venue",
  createdBy,
} = {}) {
  const { rows } = await db.query(
    `INSERT INTO events (title, description, date, location, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [title, description, date, location, createdBy],
  );
  return rows[0];
}

/**
 * Insert a tier. soldCount lets you create a pre-sold or sold-out tier.
 */
async function createTier({
  eventId,
  name = "General",
  price = 10.0,
  capacity = 100,
  soldCount = 0,
} = {}) {
  const { rows } = await db.query(
    `INSERT INTO tiers (event_id, name, price, capacity, sold_count)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [eventId, name, price, capacity, soldCount],
  );
  return rows[0];
}

/**
 * Sign a JWT with the test secret. Use to build Authorization headers without
 * going through the login endpoint.
 */
function makeToken({ sub, role = "user", email = "user@example.com" } = {}) {
  return jwt.sign({ sub, role, email }, process.env.JWT_SECRET, {
    expiresIn: "8h",
  });
}

module.exports = { createUser, createEvent, createTier, makeToken };
