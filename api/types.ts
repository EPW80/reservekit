// Shared domain types for the API. Repositories return these shapes; services
// and routes consume them. Rows come back from `pg` untyped, so repositories
// annotate their return types rather than parameterizing every query.

export type Role = "user" | "staff" | "admin";

/** Decoded JWT payload attached to `req.user` by the auth middleware. */
export interface JwtUser {
  sub: number;
  role: Role;
  email: string;
}

export interface User {
  id: number;
  email: string;
  role: Role;
  name?: string;
}

/** A user row including the password hash (only selected for login). */
export interface UserWithHash extends User {
  password_hash: string;
}

export interface EventRecord {
  id: number;
  title: string;
  description: string | null;
  date: string;
  location: string;
  image_url: string | null;
  status: "active" | "archived";
  created_by: number;
  created_at: string;
  sold_out?: boolean;
}

export interface Tier {
  id: number;
  event_id: number;
  name: string;
  price: string;
  capacity: number;
  sold_count: number;
}

export interface Reservation {
  id: number;
  user_id: number;
  event_id: number;
  tier_id: number;
  status: string;
  qr_code: string;
  created_at: string;
}

export interface Checkin {
  id: number;
  reservation_id: number;
  staff_id: number;
  checked_in_at: string;
}

/** Error shape thrown by services and read by the error-handling middleware. */
export interface AppError {
  status?: number;
  code?: string;
  message?: string;
  stack?: string;
}

declare global {
  // Augment Express so `req.user` is known across the app.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtUser;
    }
  }
}
