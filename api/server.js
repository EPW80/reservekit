require("dotenv").config();
const { validateEnv } = require("./config/env");

try {
  validateEnv();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const app = require("./app");

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ReserveKit API listening on port ${PORT}`));
