import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../api/client';

const CustomProgramsContext = createContext({ programs: [], resolve: (k) => k });

export function CustomProgramsProvider({ children }) {
  const { user } = useAuth();
  const [programs, setPrograms] = useState([]);

  useEffect(() => {
    if (!user) { setPrograms([]); return; }
    api.get('/custom-programs').then(setPrograms).catch(() => setPrograms([]));
  }, [user, user?.activeLocation?.id]);

  const resolve = useCallback((key) => {
    if (!key?.startsWith('custom_')) return key;
    const id = parseInt(key.replace('custom_', ''), 10);
    return programs.find((p) => p.id === id)?.name || key;
  }, [programs]);

  const refresh = useCallback(() => {
    if (!user) return;
    api.get('/custom-programs').then(setPrograms).catch(() => {});
  }, [user]);

  return (
    <CustomProgramsContext.Provider value={{ programs, resolve, refresh, setPrograms }}>
      {children}
    </CustomProgramsContext.Provider>
  );
}

export function useCustomPrograms() {
  return useContext(CustomProgramsContext);
}
