export type Role = 'user' | 'staff' | 'admin';

/** Decoded JWT payload stored client-side. */
export interface JwtUser {
  sub: number;
  role: Role;
  email: string;
  exp?: number;
}

export interface AuthContextValue {
  user: JwtUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

/** Standard API response envelope. */
export interface ApiEnvelope<T> {
  data: T;
  error: { code: string; message: string } | null;
}

export interface EventSummary {
  id: number;
  title: string;
  description: string | null;
  date: string | null;
  location: string | null;
  image_url: string | null;
  status?: string;
  sold_out?: boolean;
}

export interface Tier {
  id: number;
  name: string;
  price: string | number;
  capacity: number;
  sold_count: number;
}

export interface Reservation {
  id: number;
  status: string;
  created_at: string;
}
