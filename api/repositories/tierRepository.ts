import db from "../config/db";
import type { Tier } from "../types";

export async function findByEventId(eventId: number): Promise<Tier[]> {
  const { rows } = await db.query(
    `SELECT id, event_id, name, price, capacity, sold_count
     FROM tiers WHERE event_id = $1 ORDER BY price ASC`,
    [eventId],
  );
  return rows;
}

export async function findById(id: number): Promise<Tier | null> {
  const { rows } = await db.query(
    `SELECT id, event_id, name, price, capacity, sold_count
     FROM tiers WHERE id = $1`,
    [id],
  );
  return rows[0] || null;
}

export async function create(input: {
  event_id: number;
  name: string;
  price: number | string;
  capacity: number;
}): Promise<Tier> {
  const { event_id, name, price, capacity } = input;
  const { rows } = await db.query(
    `INSERT INTO tiers (event_id, name, price, capacity)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [event_id, name, price, capacity],
  );
  return rows[0];
}

// Atomically increments sold_count; throws CONFLICT if the tier is sold out.
export async function decrementCapacity(id: number): Promise<Tier> {
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
