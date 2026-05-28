import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

export const ParentAuthContext = createContext(null);

export function ParentAuthProvider({ children }) {
  const [parent, setParent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/parent/me')
      .then(setParent)
      .catch(() => setParent(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email) {
    const data = await api.post('/parent/login', { email });
    setParent(data);
    return data;
  }

  async function logout() {
    try {
      await api.post('/parent/logout', {});
    } finally {
      setParent(null);
    }
  }

  return (
    <ParentAuthContext.Provider value={{ parent, loading, login, logout }}>
      {children}
    </ParentAuthContext.Provider>
  );
}

export function useParentAuth() {
  return useContext(ParentAuthContext);
}
