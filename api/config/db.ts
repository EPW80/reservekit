import { Pool, PoolClient } from "pg";
import logger from "./logger";

interface DbPool extends Pool {
  withTransaction<T>(cb: (client: PoolClient) => Promise<T>): Promise<T>;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL }) as DbPool;

// Errors on idle clients are unexpected (e.g. the DB dropped the connection).
// Log them with full context; the pool recovers by creating new clients.
pool.on("error", (err) => {
  logger.error({ err }, "Unexpected idle pg client error");
});

/**
 * Run `cb(client)` inside a BEGIN / COMMIT transaction.
 * Rolls back automatically on error and re-throws.
 */
async function withTransaction<T>(cb: (client: PoolClient) => Promise<T>): Promise<T> {
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

export = pool;
