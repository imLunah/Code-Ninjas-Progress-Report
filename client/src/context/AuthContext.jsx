import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { invalidateCurriculumCache } from './CurriculumContext';
import ModalPortal from '../components/ui/ModalPortal';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [viewAs, setViewAs] = useState(null);

  useEffect(() => {
    api.get('/auth/me')
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // Listen for 401s fired by api/client.js — only show modal if already logged in
  useEffect(() => {
    const handler = () => {
      if (user) setSessionExpired(true);
    };
    window.addEventListener('session_expired', handler);
    return () => window.removeEventListener('session_expired', handler);
  }, [user]);

  async function login(username, password, keepSignedIn = false) {
    const data = await api.post('/auth/login', { username, password, keep_signed_in: keepSignedIn });
    setUser(data);
    return data;
  }

  async function logout() {
    try {
      await api.post('/auth/logout', {});
    } finally {
      invalidateCurriculumCache();
      setViewAs(null);
      setUser(null);
    }
  }

  const switchLocation = async (locationId) => {
    const data = await api.post('/auth/switch-location', { locationId });
    setUser(prev => ({ ...prev, activeLocation: data.activeLocation }));
  };

  const isReadOnly = user?.role === 'manager' && user?.activeLocation?.id !== user?.homeLocationId;

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout, switchLocation, isReadOnly, viewAs, setViewAs }}>
      {children}
      {sessionExpired && (
        <SessionTimeoutModal onDismiss={() => { setSessionExpired(false); setUser(null); }} />
      )}
    </AuthContext.Provider>
  );
}

function SessionTimeoutModal({ onDismiss }) {
  return (
    <ModalPortal><div className="fixed inset-0 z-[9999] flex items-start sm:items-center justify-center p-4 overflow-y-auto bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
        <div className="text-4xl mb-3">⏱️</div>
        <h2 className="text-lg font-bold font-ninja text-ninja-navy mb-2">Session Timed Out</h2>
        <p className="text-ninja-muted font-ninja text-sm leading-relaxed mb-5">
          Your session has expired. Please sign in again to continue.
        </p>
        <button
          onClick={onDismiss}
          className="w-full bg-ninja-blue hover:opacity-90 text-white font-ninja font-bold py-2.5 rounded-xl transition-opacity"
        >
          Sign In Again
        </button>
      </div>
    </div></ModalPortal>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
