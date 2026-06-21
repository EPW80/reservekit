import db from "../../config/db";

/**
 * Truncates every table in FK-safe order and resets all sequences.
 * Call in beforeEach for integration tests to guarantee a clean slate.
 */
export async function truncateAll(): Promise<void> {
  await db.query(`
    TRUNCATE TABLE checkins, reservations, tiers, events, users
    RESTART IDENTITY CASCADE
  `);
}

export { db };
