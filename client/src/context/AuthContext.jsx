import { useState } from 'react';
import { AuthContext } from './auth.js';
import { TOKEN_KEY, decodeValidToken, loadStoredToken } from './token.js';
import api from '../api/client.js';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(loadStoredToken);
  const [user, setUser] = useState(() => decodeValidToken(token));

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    const jwt = data.data.token;
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
