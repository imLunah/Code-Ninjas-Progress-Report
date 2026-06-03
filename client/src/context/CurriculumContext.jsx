import { createContext, useContext, useState, useEffect } from 'react';
import { SUB_PROGRAMS as STATIC_SUB_PROGRAMS, CURRICULUM as STATIC_CURRICULUM } from '../utils/progressData';

const CurriculumContext = createContext(null);

// Module-level cache — fetches once per page load, survives component remounts
let _cache = null;

export function CurriculumProvider({ children }) {
  const [data, setData] = useState({ subPrograms: STATIC_SUB_PROGRAMS, curriculum: STATIC_CURRICULUM, beltProjects: null });

  useEffect(() => {
    if (_cache) { setData(_cache); return; }
    Promise.all([
      fetch('/api/curriculum', { credentials: 'include' }).then(r => r.status === 204 ? null : r.json()),
      fetch('/api/curriculum/belt-projects', { credentials: 'include' }).then(r => r.ok ? r.json() : null),
    ]).then(([currData, beltData]) => {
      const merged = {
        subPrograms: currData?.curriculum ? currData.subPrograms : STATIC_SUB_PROGRAMS,
        curriculum: currData?.curriculum || STATIC_CURRICULUM,
        beltProjects: beltData || null,
      };
      _cache = merged;
      setData(merged);
    }).catch(() => {});
  }, []);

  return (
    <CurriculumContext.Provider value={data}>
      {children}
    </CurriculumContext.Provider>
  );
}

export function useCurriculum() {
  return useContext(CurriculumContext);
}

// Invalidate the cache so the next useCurriculum() call re-fetches (used after admin edits)
export function invalidateCurriculumCache() {
  _cache = null;
}
