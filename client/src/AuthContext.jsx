import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, setSessionToken, setUnauthorizedHandler } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const logout = useCallback(() => {
    setSessionToken(null);
    setUser(null);
    setError(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
      setError('Your session has expired. Please sign in again.');
    });
    return () => setUnauthorizedHandler(() => {});
  }, [logout]);

  const authenticate = async (mode, credentials) => {
    setError(null);
    try {
      const session = await api.auth[mode](credentials);
      setSessionToken(session.token);
      setUser(session.user);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <AuthContext.Provider value={{ user, error, authenticate, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
