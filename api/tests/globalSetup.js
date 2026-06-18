/**
 * Runs once before all test suites.
 * Creates the schema on the test database (idempotent — safe to re-run).
 * process.env.DATABASE_URL is already pointed at the test DB by jest.config.js.
 */
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

module.exports = async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id       SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      run_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const migrationsDir = path.join(__dirname, "../../db/migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const { rows } = await pool.query("SELECT 1 FROM _migrations WHERE filename = $1", [file]);
    if (rows.length) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    await pool.query(sql);
    await pool.query("INSERT INTO _migrations (filename) VALUES ($1)", [file]);
  }

  await pool.end();
};
