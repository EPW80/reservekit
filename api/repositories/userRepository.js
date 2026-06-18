const db = require("../config/db");

async function findByEmail(email) {
  const { rows } = await db.query(
    "SELECT id, email, password_hash, role FROM users WHERE email = $1",
    [email],
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await db.query("SELECT id, email, role FROM users WHERE id = $1", [id]);
  return rows[0] || null;
}

async function create({ email, passwordHash, name, role = "user" }) {
  const { rows } = await db.query(
    `INSERT INTO users (email, password_hash, name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, name, role`,
    [email, passwordHash, name, role],
  );
  return rows[0];
}

module.exports = { findByEmail, findById, create };
