import { useState } from 'react';
import { AuthContext } from './auth.js';
import api from '../api/client.js';

function decodeToken(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('rk_token'));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('rk_token');
    return stored ? decodeToken(stored) : null;
  });

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    const jwt = data.data.token;
    localStorage.setItem('rk_token', jwt);
    setToken(jwt);
    setUser(decodeToken(jwt));
  }

  function logout() {
    localStorage.removeItem('rk_token');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>{children}</AuthContext.Provider>
  );
}
