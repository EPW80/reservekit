const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userRepository = require("../repositories/userRepository");

async function login(email, password) {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw { status: 401, code: "UNAUTHORIZED", message: "Invalid credentials" };
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw { status: 401, code: "UNAUTHORIZED", message: "Invalid credentials" };
  }

  const token = jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "8h" },
  );

  return { token };
}

module.exports = { login };
