import { useContext } from 'react';
import { AuthContext } from '../context/auth.js';

export function useAuth() {
  return useContext(AuthContext);
}
