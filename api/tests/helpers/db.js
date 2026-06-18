const db = require("../../config/db");

/**
 * Truncates every table in FK-safe order and resets all sequences.
 * Call in beforeEach for integration tests to guarantee a clean slate.
 */
async function truncateAll() {
  await db.query(`
    TRUNCATE TABLE checkins, reservations, tiers, events, users
    RESTART IDENTITY CASCADE
  `);
}

module.exports = { db, truncateAll };
