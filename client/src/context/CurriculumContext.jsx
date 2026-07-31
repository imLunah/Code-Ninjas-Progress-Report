import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SUB_PROGRAMS as STATIC_SUB_PROGRAMS, CURRICULUM as STATIC_CURRICULUM } from '../utils/progressData';

const CurriculumContext = createContext(null);

const STATIC_DATA = { subPrograms: STATIC_SUB_PROGRAMS, curriculum: STATIC_CURRICULUM, beltProjects: null };

// Module-level cache — survives component remounts within same page load
let _cache = null;
// In-flight request, so two consumers mounting together share one round trip
let _inflight = null;

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

function loadCurriculum() {
  if (_cache) return Promise.resolve(_cache);
  if (!_inflight) {
    _inflight = fetchCurriculumData()
      .then((merged) => { _cache = merged; _inflight = null; return merged; })
      .catch((err) => { _inflight = null; throw err; });
  }
  return _inflight;
}

export function CurriculumProvider({ children }) {
  const [data, setData] = useState(_cache || STATIC_DATA);

  const refresh = useCallback(async () => {
    _cache = null;
    _inflight = null;
    try {
      setData(await loadCurriculum());
    } catch {}
  }, []);

  // The provider sits above the router, so fetching on mount put ~60kB of curriculum on
  // the landing and login path, where nothing reads it. Consumers pull it in instead.
  const ensureLoaded = useCallback(() => {
    if (_cache) { setData(_cache); return; }
    loadCurriculum().then(setData).catch(() => {});
  }, []);

  return (
    <CurriculumContext.Provider value={{ ...data, refresh, ensureLoaded }}>
      {children}
    </CurriculumContext.Provider>
  );
}

export function useCurriculum() {
  const ctx = useContext(CurriculumContext);
  const ensureLoaded = ctx?.ensureLoaded;
  useEffect(() => { ensureLoaded?.(); }, [ensureLoaded]);
  return ctx;
}

// Invalidate the cache so the next mount re-fetches
export function invalidateCurriculumCache() {
  _cache = null;
  _inflight = null;
}
