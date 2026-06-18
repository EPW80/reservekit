const db = require("../config/db");

async function findAll() {
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

async function findById(id) {
  const { rows } = await db.query(
    `SELECT id, title, description, date, location, image_url, status, created_by, created_at
     FROM events WHERE id = $1`,
    [id],
  );
  return rows[0] || null;
}

async function create({ title, description = null, date, location, image_url = null, created_by }) {
  const { rows } = await db.query(
    `INSERT INTO events (title, description, date, location, image_url, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [title, description, date, location, image_url, created_by],
  );
  return rows[0];
}

async function update(id, fields) {
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

async function softDelete(id) {
  const { rows } = await db.query(
    `UPDATE events SET status = 'archived' WHERE id = $1 RETURNING *`,
    [id],
  );
  return rows[0] || null;
}

module.exports = { findAll, findById, create, update, softDelete };
