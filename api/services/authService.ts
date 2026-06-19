import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import * as userRepository from "../repositories/userRepository";
import { JWT_EXPIRY } from "../config/constants";

export async function login(email: string, password: string): Promise<{ token: string }> {
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
    process.env.JWT_SECRET as string,
    { expiresIn: JWT_EXPIRY },
  );

  return { token };
}
