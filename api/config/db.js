const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.on("error", (err) => {
  console.error("Unexpected pg pool error", err);
});

/**
 * Run `cb(client)` inside a BEGIN / COMMIT transaction.
 * Rolls back automatically on error and re-throws.
 */
async function withTransaction(cb) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await cb(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

pool.withTransaction = withTransaction;

module.exports = pool;
