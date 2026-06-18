const db = require("../config/db");

async function findByEventId(eventId) {
  const { rows } = await db.query(
    `SELECT id, event_id, name, price, capacity, sold_count
     FROM tiers WHERE event_id = $1 ORDER BY price ASC`,
    [eventId],
  );
  return rows;
}

async function findById(id) {
  const { rows } = await db.query(
    `SELECT id, event_id, name, price, capacity, sold_count
     FROM tiers WHERE id = $1`,
    [id],
  );
  return rows[0] || null;
}

async function create({ event_id, name, price, capacity }) {
  const { rows } = await db.query(
    `INSERT INTO tiers (event_id, name, price, capacity)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [event_id, name, price, capacity],
  );
  return rows[0];
}

// Atomically increments sold_count; throws CONFLICT if tier is sold out.
async function decrementCapacity(id) {
  const { rows } = await db.query(
    `UPDATE tiers SET sold_count = sold_count + 1
     WHERE id = $1 AND sold_count < capacity
     RETURNING *`,
    [id],
  );
  if (!rows.length) {
    throw { status: 409, code: "CONFLICT", message: "Tier is sold out" };
  }
  return rows[0];
}

module.exports = { findByEventId, findById, create, decrementCapacity };
