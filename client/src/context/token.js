import { jwtDecode } from 'jwt-decode';

export const TOKEN_KEY = 'rk_token';

// Decode a JWT and return its payload, or null if it's malformed or expired.
// (Decoding is not verification — the server still verifies the signature; this
// just avoids treating a junk or stale token as a logged-in session.)
export function decodeValidToken(token) {
  if (!token) return null;
  try {
    const payload = jwtDecode(token);
    if (payload.exp && payload.exp * 1000 <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// Read the stored token, discarding it if it's missing, malformed, or expired.
export function loadStoredToken() {
  const stored = localStorage.getItem(TOKEN_KEY);
  if (!stored) return null;
  if (!decodeValidToken(stored)) {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
  return stored;
}
