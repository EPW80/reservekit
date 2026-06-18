const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const {
  JSON_BODY_LIMIT,
  GLOBAL_RATE_LIMIT_WINDOW_MS,
  GLOBAL_RATE_LIMIT_MAX,
} = require("./config/constants");

const authRoutes = require("./routes/auth");
const eventRoutes = require("./routes/events");
const reservationRoutes = require("./routes/reservations");
const checkinRoutes = require("./routes/checkins");
const adminRoutes = require("./routes/admin");
const errorHandler = require("./middleware/error");

const app = express();

// Trust the reverse proxy so rate-limit / secure cookies see the real client IP.
app.set("trust proxy", 1);

app.use(helmet());

// CORS: only allow configured origins. ALLOWED_ORIGINS is a comma-separated list;
// defaults to the local Vite dev server when unset.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser clients (curl, server-to-server) that send no Origin.
      // For disallowed browser origins, emit no CORS header (the browser blocks)
      // rather than throwing — avoids noisy 500s while still denying access.
      callback(null, !origin || allowedOrigins.includes(origin));
    },
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: JSON_BODY_LIMIT }));

// Rate limiting is disabled under test so the suite (hundreds of requests from
// one IP) stays deterministic. The limiter config itself is unit-tested.
if (process.env.NODE_ENV !== "test") {
  app.use(
    rateLimit({
      windowMs: GLOBAL_RATE_LIMIT_WINDOW_MS,
      max: GLOBAL_RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) =>
        res.status(429).json({
          data: null,
          error: { code: "RATE_LIMITED", message: "Too many requests, please try again later" },
        }),
    }),
  );
}

app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/checkins", checkinRoutes);
app.use("/api/admin", adminRoutes);

app.use(errorHandler);

module.exports = app;
