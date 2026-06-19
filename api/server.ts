import "dotenv/config";
import { validateEnv } from "./config/env";
import logger from "./config/logger";
import db from "./config/db";
import app from "./app";

try {
  validateEnv();
} catch (err) {
  // Logger may be at info level; use console so this fatal is always visible.
  console.error((err as Error).message);
  process.exit(1);
}

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => logger.info(`ReserveKit API listening on port ${PORT}`));

// Drain in-flight requests, then close the DB pool, on orchestrator signals.
let shuttingDown = false;
function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received — shutting down gracefully`);

  const force = setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000);
  force.unref();

  server.close(async () => {
    try {
      await db.end();
      logger.info("Shutdown complete");
      process.exit(0);
    } catch (err) {
      logger.error({ err }, "Error during shutdown");
      process.exit(1);
    }
  });
}

(["SIGTERM", "SIGINT"] as const).forEach((sig) => process.on(sig, () => shutdown(sig)));
