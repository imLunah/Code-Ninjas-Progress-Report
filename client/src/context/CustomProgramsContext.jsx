import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../api/client';

const CustomProgramsContext = createContext({ programs: [], isCustomProgram: () => false });

export function CustomProgramsProvider({ children }) {
  const { user } = useAuth();
  const [programs, setPrograms] = useState([]);

  useEffect(() => {
    if (!user) { setPrograms([]); return; }
    api.get('/custom-programs').then(setPrograms).catch(() => setPrograms([]));
  }, [user, user?.activeLocation?.id]);

  const isCustomProgram = useCallback((name) => {
    if (!name) return false;
    return programs.some((p) => p.name === name);
  }, [programs]);

  const refresh = useCallback(() => {
    if (!user) return;
    api.get('/custom-programs').then(setPrograms).catch(() => {});
  }, [user]);

  return (
    <CustomProgramsContext.Provider value={{ programs, isCustomProgram, refresh, setPrograms }}>
      {children}
    </CustomProgramsContext.Provider>
  );
}

export function useCustomPrograms() {
  return useContext(CustomProgramsContext);
}
