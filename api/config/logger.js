const pino = require("pino");

// Level resolution: explicit LOG_LEVEL wins; tests are silent to keep output
// clean; development is verbose; everything else defaults to info.
function resolveLevel() {
  if (process.env.LOG_LEVEL) return process.env.LOG_LEVEL;
  if (process.env.NODE_ENV === "test") return "silent";
  if (process.env.NODE_ENV === "development") return "debug";
  return "info";
}

const logger = pino({ level: resolveLevel() });

module.exports = logger;
