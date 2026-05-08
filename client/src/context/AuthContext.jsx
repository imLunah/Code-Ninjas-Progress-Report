import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session on mount
    api.get('/auth/me')
      .then((data) => {
        setUser(data);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function login(username, password) {
    const data = await api.post('/auth/login', { username, password });
    setUser(data);
    return data;
  }

  async function logout() {
    await api.post('/auth/logout', {});
    setUser(null);
  }

  const switchLocation = async (locationId) => {
    const data = await api.post('/auth/switch-location', { locationId });
    setUser(prev => ({ ...prev, activeLocation: data.activeLocation }));
  };

  // true when a manager is viewing a center other than their home center
  const isReadOnly = user?.role === 'manager' && user?.activeLocation?.id !== user?.homeLocationId;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, switchLocation, isReadOnly }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
