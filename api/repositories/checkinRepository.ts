import { PoolClient } from "pg";
import db from "../config/db";
import type { Checkin } from "../types";

export async function create(
  input: { reservation_id: number; staff_id: number },
  client?: PoolClient,
): Promise<Checkin> {
  const conn = client || db;
  const { rows } = await conn.query(
    `INSERT INTO checkins (reservation_id, staff_id)
     VALUES ($1, $2)
     RETURNING *`,
    [input.reservation_id, input.staff_id],
  );
  return rows[0];
}

export async function findByReservationId(reservationId: number): Promise<Checkin | null> {
  const { rows } = await db.query(
    `SELECT id, reservation_id, staff_id, checked_in_at
     FROM checkins WHERE reservation_id = $1`,
    [reservationId],
  );
  return rows[0] || null;
}

export interface EventCheckinRow {
  id: number;
  checked_in_at: string;
  attendee_email: string;
  staff_email: string;
  tier_name: string;
}

export async function findByEventId(eventId: number): Promise<EventCheckinRow[]> {
  const { rows } = await db.query(
    `SELECT c.id, c.checked_in_at,
            u.email  AS attendee_email,
            s.email  AS staff_email,
            t.name   AS tier_name
     FROM checkins c
     JOIN reservations r ON r.id = c.reservation_id
     JOIN users u        ON u.id = r.user_id
     JOIN users s        ON s.id = c.staff_id
     JOIN tiers t        ON t.id = r.tier_id
     WHERE r.event_id = $1
     ORDER BY c.checked_in_at DESC`,
    [eventId],
  );
  return rows;
}
