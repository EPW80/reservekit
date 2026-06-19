import db from "../config/db";
import type { Role, User, UserWithHash } from "../types";

export async function findByEmail(email: string): Promise<UserWithHash | null> {
  const { rows } = await db.query(
    "SELECT id, email, password_hash, role FROM users WHERE email = $1",
    [email],
  );
  return rows[0] || null;
}

export async function findById(id: number): Promise<User | null> {
  const { rows } = await db.query("SELECT id, email, role FROM users WHERE id = $1", [id]);
  return rows[0] || null;
}

export async function create(input: {
  email: string;
  passwordHash: string;
  name: string;
  role?: Role;
}): Promise<User> {
  const { email, passwordHash, name, role = "user" } = input;
  const { rows } = await db.query(
    `INSERT INTO users (email, password_hash, name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, name, role`,
    [email, passwordHash, name, role],
  );
  return rows[0];
}
