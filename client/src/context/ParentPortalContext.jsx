import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import { useParentAuth } from './ParentAuthContext';

// The parent portal's one source of family state.
//
// Every parent page shows ONE child at a time and switches between them from
// the same control, so the list of children and which one is selected live
// here rather than in each page. The detail for the selected child (programs,
// logs, clubs, today's check-ins, the note) is fetched once and kept per child,
// so moving between Home, Courses and Note does not refetch, and switching
// children and back is instant.
//
// The chosen child survives a reload through localStorage, keyed by parent
// email so two parents on one device do not inherit each other's choice.

const ParentPortalContext = createContext(null);

const storageKey = (email) => `dj-parent-child:${String(email || '').toLowerCase()}`;

export function ParentPortalProvider({ children }) {
  const { parent } = useParentAuth();
  const [students, setStudents] = useState(null);      // null = not loaded yet
  const [listError, setListError] = useState('');
  const [activeId, setActiveIdState] = useState(null);
  // Home can show every child at once; everywhere else is one child. Starts
  // on "all" for a family with more than one, on the child otherwise.
  const [viewAll, setViewAll] = useState(true);
  const [details, setDetails] = useState({});          // id -> detail payload
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const inflight = useRef(new Set());

  // Family list.
  useEffect(() => {
    if (!parent) { setStudents(null); setActiveIdState(null); setDetails({}); return; }
    let cancelled = false;
    api.get('/parent/students')
      .then((rows) => {
        if (cancelled) return;
        setStudents(rows);
        // Prefer the remembered child, else the first.
        let remembered = null;
        try { remembered = Number(localStorage.getItem(storageKey(parent.email))) || null; } catch { /* ignore */ }
        const first = rows[0]?.id ?? null;
        setActiveIdState(rows.some((r) => r.id === remembered) ? remembered : first);
        setViewAll(rows.length > 1);
      })
      .catch(() => { if (!cancelled) { setStudents([]); setListError("Could not load your children's profiles."); } });
    return () => { cancelled = true; };
  }, [parent]);

  const setActiveId = useCallback((id) => {
    setActiveIdState(id);
    try { if (parent?.email) localStorage.setItem(storageKey(parent.email), String(id)); } catch { /* ignore */ }
  }, [parent]);

  // Detail for the selected child, cached per id.
  const load = useCallback((id, { force = false } = {}) => {
    if (!id) return;
    if (!force && details[id]) return;
    if (inflight.current.has(id)) return;
    inflight.current.add(id);
    setDetailLoading(true);
    setDetailError('');
    api.get(`/parent/students/${id}`)
      .then((data) => setDetails((prev) => ({ ...prev, [id]: data })))
      .catch(() => setDetailError('Could not load this profile.'))
      .finally(() => { inflight.current.delete(id); setDetailLoading(false); });
  }, [details]);

  useEffect(() => { load(activeId); }, [activeId, load]);

  const saveNote = useCallback(async (id, text) => {
    const result = await api.patch(`/parent/students/${id}/instructions`, { special_instructions: text });
    setDetails((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), special_instructions: result.special_instructions || '' } }));
    return result;
  }, []);

  const value = useMemo(() => {
    const active = (students || []).find((s) => s.id === activeId) || null;
    return {
      students,
      listError,
      active,
      activeId,
      setActiveId,
      viewAll,
      setViewAll,
      detail: activeId ? details[activeId] || null : null,
      detailFor: (id) => details[id] || null,
      loadDetail: load,
      detailLoading: detailLoading && !(activeId && details[activeId]),
      detailError,
      refresh: () => load(activeId, { force: true }),
      saveNote,
    };
  }, [students, listError, activeId, setActiveId, viewAll, details, detailLoading, detailError, load, saveNote]);

  return <ParentPortalContext.Provider value={value}>{children}</ParentPortalContext.Provider>;
}

export function useParentPortal() {
  return useContext(ParentPortalContext);
}
