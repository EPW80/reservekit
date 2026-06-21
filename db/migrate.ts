import "dotenv/config";
import fs from "fs";
import path from "path";
import db from "../api/config/db";

async function migrate(): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id       SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      run_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const dir = path.join(__dirname, "migrations");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const { rows } = await db.query("SELECT 1 FROM _migrations WHERE filename = $1", [file]);
    if (rows.length) {
      console.log(`Skip:  ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    await db.query(sql);
    await db.query("INSERT INTO _migrations (filename) VALUES ($1)", [file]);
    console.log(`Ran:   ${file}`);
  }

  console.log("Migrations complete.");
  await db.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
