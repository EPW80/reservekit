import { useState, type ReactNode } from 'react';
import { AuthContext } from './auth';
import { TOKEN_KEY, decodeValidToken, loadStoredToken } from './token';
import api from '../api/client';
import type { JwtUser } from '../types';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(loadStoredToken);
  const [user, setUser] = useState<JwtUser | null>(() => decodeValidToken(token));

  async function login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password });
    const jwt = data.data.token as string;
    localStorage.setItem(TOKEN_KEY, jwt);
    setToken(jwt);
    setUser(decodeValidToken(jwt));
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>{children}</AuthContext.Provider>
  );
}
