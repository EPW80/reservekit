const db = require("../config/db");

async function create({ reservation_id, staff_id }, client) {
  const conn = client || db;
  const { rows } = await conn.query(
    `INSERT INTO checkins (reservation_id, staff_id)
     VALUES ($1, $2)
     RETURNING *`,
    [reservation_id, staff_id],
  );
  return rows[0];
}

async function findByReservationId(reservationId) {
  const { rows } = await db.query(
    `SELECT id, reservation_id, staff_id, checked_in_at
     FROM checkins WHERE reservation_id = $1`,
    [reservationId],
  );
  return rows[0] || null;
}

async function findByEventId(eventId) {
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

module.exports = { create, findByReservationId, findByEventId };
