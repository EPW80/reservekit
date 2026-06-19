import db from "../config/db";
import type { EventRecord } from "../types";

export async function findAll(): Promise<EventRecord[]> {
  const { rows } = await db.query(
    `SELECT e.id, e.title, e.description, e.date, e.location, e.image_url, e.status, e.created_by, e.created_at,
            CASE WHEN COUNT(t.id) > 0 AND COUNT(t.id) = COUNT(CASE WHEN t.sold_count >= t.capacity THEN 1 END)
                 THEN true ELSE false END AS sold_out
     FROM events e
     LEFT JOIN tiers t ON t.event_id = e.id
     WHERE e.status = 'active'
     GROUP BY e.id
     ORDER BY e.date ASC`,
  );
  return rows;
}

export async function findById(id: number): Promise<EventRecord | null> {
  const { rows } = await db.query(
    `SELECT id, title, description, date, location, image_url, status, created_by, created_at
     FROM events WHERE id = $1`,
    [id],
  );
  return rows[0] || null;
}

export async function create(input: {
  title: string;
  description?: string | null;
  date: string;
  location: string;
  image_url?: string | null;
  created_by: number;
}): Promise<EventRecord> {
  const { title, description = null, date, location, image_url = null, created_by } = input;
  const { rows } = await db.query(
    `INSERT INTO events (title, description, date, location, image_url, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [title, description, date, location, image_url, created_by],
  );
  return rows[0];
}

export async function update(
  id: number,
  fields: Record<string, unknown>,
): Promise<EventRecord | null> {
  const allowed = ["title", "description", "date", "location", "image_url", "status"];
  const keys = Object.keys(fields).filter((k) => allowed.includes(k));
  if (!keys.length) return findById(id);

  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  const values = [...keys.map((k) => fields[k]), id];

  const { rows } = await db.query(
    `UPDATE events SET ${setClauses} WHERE id = $${values.length} RETURNING *`,
    values,
  );
  return rows[0] || null;
}

export async function softDelete(id: number): Promise<EventRecord | null> {
  const { rows } = await db.query(
    `UPDATE events SET status = 'archived' WHERE id = $1 RETURNING *`,
    [id],
  );
  return rows[0] || null;
}
