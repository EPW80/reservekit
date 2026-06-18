require("dotenv").config();
const bcrypt = require("bcrypt");
const db = require("../api/config/db");

async function seed() {
  // ── Users ──────────────────────────────────────────────────────────────────
  const [adminHash, staffHash, userHash] = await Promise.all([
    bcrypt.hash("admin123", 10),
    bcrypt.hash("staff123", 10),
    bcrypt.hash("user123", 10),
  ]);

  await db.query(
    `
    INSERT INTO users (email, password_hash, role, name) VALUES
      ('admin@reservekit.dev', $1, 'admin', 'Admin User'),
      ('staff@reservekit.dev', $2, 'staff', 'Staff User'),
      ('alice@example.com',    $3, 'user',  'Alice Demo')
    ON CONFLICT (email) DO NOTHING
    RETURNING id, role
  `,
    [adminHash, staffHash, userHash],
  );

  // Fetch admin id whether rows were just inserted or already existed
  const {
    rows: [admin],
  } = await db.query(`SELECT id FROM users WHERE email = 'admin@reservekit.dev'`);

  // ── Events ─────────────────────────────────────────────────────────────────
  const { rows: events } = await db.query(
    `
    INSERT INTO events (title, date, location, created_by) VALUES
      ('Summer Gala 2026',     '2026-07-15 19:00:00+00', 'Rooftop Terrace',   $1),
      ('Tech Conference 2026', '2026-09-10 09:00:00+00', 'Convention Center', $1),
      ('Sold-Out Showcase',    '2026-05-01 20:00:00+00', 'The Venue',         $1)
    ON CONFLICT (title, date) DO NOTHING
    RETURNING id, title
  `,
    [admin.id],
  );

  if (!events.length) {
    console.log("Events already seeded — skipping tiers.");
    await db.end();
    return;
  }

  // ── Tiers ──────────────────────────────────────────────────────────────────
  // Sold-Out Showcase: sold_count = capacity so decrementCapacity will 409
  for (const event of events) {
    const soldOut = event.title === "Sold-Out Showcase";
    await db.query(
      `
      INSERT INTO tiers (event_id, name, price, capacity, sold_count) VALUES
        ($1, 'General Admission', 25.00, 100, $2),
        ($1, 'VIP',               75.00,  50, $3)
    `,
      [event.id, soldOut ? 100 : 20, soldOut ? 50 : 10],
    );
    console.log(`Seeded tiers for: ${event.title}${soldOut ? " (sold out)" : ""}`);
  }

  console.log("Seed complete.");
  await db.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
