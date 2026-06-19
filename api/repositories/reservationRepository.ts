import { PoolClient } from "pg";
import db from "../config/db";
import type { Reservation } from "../types";

export async function create(input: {
  user_id: number;
  event_id: number;
  tier_id: number;
  qr_code: string;
}): Promise<Reservation> {
  const { user_id, event_id, tier_id, qr_code } = input;
  const { rows } = await db.query(
    `INSERT INTO reservations (user_id, event_id, tier_id, qr_code)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [user_id, event_id, tier_id, qr_code],
  );
  return rows[0];
}

export async function findById(id: number): Promise<Reservation | null> {
  const { rows } = await db.query(
    `SELECT id, user_id, event_id, tier_id, status, qr_code, created_at
     FROM reservations WHERE id = $1`,
    [id],
  );
  return rows[0] || null;
}

export async function updateStatus(
  id: number,
  status: string,
  client?: PoolClient,
): Promise<Reservation | null> {
  const conn = client || db;
  const { rows } = await conn.query(
    `UPDATE reservations SET status = $1 WHERE id = $2 RETURNING *`,
    [status, id],
  );
  return rows[0] || null;
}

export interface ExportRow {
  email: string;
  name: string;
  event_name: string;
  tier_name: string;
  status: string;
  checked_in: boolean;
}

export async function findForExport(eventId?: number): Promise<ExportRow[]> {
  const params = eventId ? [eventId] : [];
  const filter = eventId ? "AND e.id = $1" : "";

  const { rows } = await db.query(
    `SELECT
       u.email,
       COALESCE(u.name, u.email) AS name,
       e.title                   AS event_name,
       t.name                    AS tier_name,
       r.status,
       (c.id IS NOT NULL)        AS checked_in
     FROM reservations r
     JOIN users u  ON u.id = r.user_id
     JOIN events e ON e.id = r.event_id
     JOIN tiers t  ON t.id = r.tier_id
     LEFT JOIN checkins c ON c.reservation_id = r.id
     WHERE 1=1 ${filter}
     ORDER BY e.date ASC, u.email ASC`,
    params,
  );
  return rows;
}

export async function findByQrCode(qr_code: string): Promise<Reservation | null> {
  const { rows } = await db.query(
    `SELECT id, user_id, event_id, tier_id, status, qr_code, created_at
     FROM reservations WHERE qr_code = $1`,
    [qr_code],
  );
  return rows[0] || null;
}
