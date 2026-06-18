const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const eventRoutes = require("./routes/events");
const reservationRoutes = require("./routes/reservations");
const checkinRoutes = require("./routes/checkins");
const adminRoutes = require("./routes/admin");
const errorHandler = require("./middleware/error");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/checkins", checkinRoutes);
app.use("/api/admin", adminRoutes);

app.use(errorHandler);

module.exports = app;
