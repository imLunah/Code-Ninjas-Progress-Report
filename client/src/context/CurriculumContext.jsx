import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SUB_PROGRAMS as STATIC_SUB_PROGRAMS, CURRICULUM as STATIC_CURRICULUM } from '../utils/progressData';

const CurriculumContext = createContext(null);

// Module-level cache — survives component remounts within same page load
let _cache = null;

async function fetchCurriculumData() {
  const [currData, beltData] = await Promise.all([
    fetch('/api/curriculum', { credentials: 'include' }).then(r => r.status === 204 ? null : r.json()),
    fetch('/api/curriculum/belt-projects', { credentials: 'include' }).then(r => r.ok ? r.json() : null),
  ]);
  return {
    subPrograms: currData?.curriculum ? currData.subPrograms : STATIC_SUB_PROGRAMS,
    curriculum: currData?.curriculum || STATIC_CURRICULUM,
    beltProjects: beltData || null,
  };
}

export function CurriculumProvider({ children }) {
  const [data, setData] = useState({ subPrograms: STATIC_SUB_PROGRAMS, curriculum: STATIC_CURRICULUM, beltProjects: null });

  const refresh = useCallback(async () => {
    _cache = null;
    try {
      const merged = await fetchCurriculumData();
      _cache = merged;
      setData(merged);
    } catch {}
  }, []);

  useEffect(() => {
    if (_cache) { setData(_cache); return; }
    fetchCurriculumData().then(merged => {
      _cache = merged;
      setData(merged);
    }).catch(() => {});
  }, []);

  return (
    <CurriculumContext.Provider value={{ ...data, refresh }}>
      {children}
    </CurriculumContext.Provider>
  );
}

export function useCurriculum() {
  return useContext(CurriculumContext);
}

// Invalidate the cache so the next mount re-fetches
export function invalidateCurriculumCache() {
  _cache = null;
}
