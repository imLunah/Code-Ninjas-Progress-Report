import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Papa from 'papaparse';
import Layout from '../../components/layout/Layout';
import BeltBadge from '../../components/ui/BeltBadge';
import ProgramBadge from '../../components/ui/ProgramBadge';
import Button from '../../components/ui/Button';
import { api } from '../../api/client';
import { PROGRAMS, getBelt } from '../../utils/beltConfig';
import { formatDate } from '../../utils/dateUtils';
import { useAuth } from '../../context/AuthContext';


function parseProgram(membership) {
  if (!membership) return null;
  if (membership.includes('CODE NINJAS: CREATE')) return 'CREATE';
  if (membership.includes('CODE NINJAS: JR')) return 'JR';
  if (membership.includes('Robotics')) return 'Robotics Academy';
  if (membership.includes('AI')) return 'AI Academy';
  return null;
}

const AVATAR_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6',
  '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1', '#f59e0b',
];

function getAvatarColor(name) {
  const sum = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function getInitials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const FILTER_CHIPS = [
  { label: 'All', value: '' },
  { label: 'CREATE', value: 'CREATE' },
  { label: 'Robotics Academy', value: 'Robotics Academy' },
  { label: 'AI Academy', value: 'AI Academy' },
  { label: 'JR', value: 'JR' },
];

export default function StudentRoster() {
  const [students, setStudents] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [programCounts, setProgramCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [sort, setSort] = useState('last_active');

  const [showArchived, setShowArchived] = useState(false);

  // Bulk actions
  const [selected, setSelected] = useState(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmPermanentBulk, setConfirmPermanentBulk] = useState(false);
  const [permanentDeleting, setPermanentDeleting] = useState(false);

  // CSV import
  const [importModal, setImportModal] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef(null);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isReadOnly, viewAs } = useAuth();
  const isSenseiView = user?.role === 'admin' && viewAs === 'sensei';
  const isManager = ['manager', 'admin'].includes(user?.role) && !isReadOnly && !isSenseiView;
  const isLogMode = searchParams.get('mode') === 'log';

  const PAGE_SIZE = 25;
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const mobileSentinelRef = useRef(null);
  const desktopSentinelRef = useRef(null);

  const loadStudents = (offset = 0, append = false) => {
    if (append && loadingMore) return;
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (programFilter) params.set('program', programFilter);
    params.set('sort', sort);
    params.set('limit', PAGE_SIZE);
    params.set('offset', offset);
    if (showArchived && isManager) params.set('inactive', 'true');
    if (append) setLoadingMore(true);
    else setLoading(true);
    api.get(`/students?${params.toString()}`)
      .then(({ students: page, total, programCounts: counts }) => {
        setStudents((prev) => append ? [...prev, ...page] : page);
        setTotalCount(total);
        if (counts && !showArchived) setProgramCounts(counts);
        setHasMore(page.length === PAGE_SIZE);
        if (!append) setSelected(new Set());
      })
      .catch(() => setError('Failed to load ninjas'))
      .finally(() => { setLoading(false); setLoadingMore(false); });
  };

  useEffect(() => { loadStudents(0); }, [search, programFilter, sort, showArchived, user?.activeLocation?.id]);

  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          loadStudents(students.length, true);
        }
      },
      { rootMargin: '120px' }
    );

    if (mobileSentinelRef.current) observer.observe(mobileSentinelRef.current);
    if (desktopSentinelRef.current) observer.observe(desktopSentinelRef.current);

    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, students.length]);

  const sorted = students;

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === sorted.length) setSelected(new Set());
    else setSelected(new Set(sorted.map((s) => s.id)));
  };

  const handleDeleteSelected = async () => {
    setDeleting(true);
    setError('');
    const results = await Promise.allSettled([...selected].map((id) => api.delete(`/students/${id}`)));
    const failed = results.filter((r) => r.status === 'rejected').length;
    setDeleting(false);
    setConfirmDelete(false);
    setSelected(new Set());
    loadStudents();
    if (failed > 0) setError(`${failed} ninja${failed > 1 ? 's' : ''} could not be removed. Please try again.`);
  };

  const handlePermanentDeleteSelected = async () => {
    setPermanentDeleting(true);
    setError('');
    const results = await Promise.allSettled([...selected].map((id) => api.delete(`/students/${id}/permanent`)));
    const failed = results.filter((r) => r.status === 'rejected').length;
    setPermanentDeleting(false);
    setConfirmPermanentBulk(false);
    setSelected(new Set());
    loadStudents();
    if (failed > 0) setError(`${failed} ninja${failed > 1 ? 's' : ''} could not be permanently deleted. Please try again.`);
  };

  const handleRestore = async (id) => {
    try {
      await api.patch(`/students/${id}/restore`, {});
      setStudents((prev) => prev.filter((s) => s.id !== id));
      setTotalCount((c) => c - 1);
    } catch (err) {
      setError(err?.message || 'Failed to restore ninja');
    }
  };

  const [confirmPermanentId, setConfirmPermanentId] = useState(null);
  const handlePermanentDelete = async (id) => {
    try {
      await api.delete(`/students/${id}/permanent`);
      setStudents((prev) => prev.filter((s) => s.id !== id));
      setTotalCount((c) => c - 1);
    } catch (err) {
      setError(err?.message || 'Failed to delete ninja');
    } finally {
      setConfirmPermanentId(null);
    }
  };

  const handleRowClick = (student) => {
    if (isLogMode) {
      const programs = (student.programs || []).map(p => p.program).join(',');
      navigate(`/sensei/student/${student.id}${programs ? `?programs=${encodeURIComponent(programs)}` : ''}`);
    } else {
      navigate(`/manager/students/${student.id}`);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportError('');
    setImportResult(null);
    setImporting(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data;
        const students = rows
          .map((row) => ({
            full_name: `${row['Participant First Name'] || ''} ${row['Participant Last Name'] || ''}`.trim(),
            birthday: row['Birthday'] || null,
            parent_name: `${row['Customer First Name'] || ''} ${row['Customer Last Name'] || ''}`.trim() || null,
            parent_email: row['Email']?.trim() || null,
            parent_phone: row['Mobile Phone']?.trim() || null,
            program: parseProgram(row['Membership']),
            belt_raw: row['Rank'] || null,
          }))
          .filter((s) => s.full_name && s.program);

        if (students.length === 0) {
          setImportError('No valid students found in this file. Make sure it\'s a MyStudio export.');
          setImporting(false);
          return;
        }

        try {
          const result = await api.post('/students/import', { students });
          setImportResult(result);
          loadStudents();
        } catch (err) {
          setImportError(err.message || 'Import failed');
        } finally {
          setImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      },
      error: () => {
        setImportError('Failed to read CSV file.');
        setImporting(false);
      },
    });
  };

  const chipCounts = FILTER_CHIPS.reduce((acc, chip) => {
    acc[chip.value] = chip.value
      ? (programCounts[chip.value] ?? 0)
      : totalCount;
    return acc;
  }, {});

  return (
    <Layout>
      <div className="space-y-4 lg:h-[calc(100dvh-64px)] lg:flex lg:flex-col lg:space-y-0 lg:gap-4">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-ninja text-ninja-navy leading-tight">
              {isLogMode ? 'Log Progress' : showArchived ? 'Archived Ninjas' : 'Ninjas'}
            </h1>
            <p className="text-ninja-muted font-ninja text-sm mt-0.5">
              {isLogMode
                ? 'Pick a ninja to log a session'
                : showArchived
                ? `${totalCount} archived ninja${totalCount !== 1 ? 's' : ''}`
                : `${totalCount} active ninja${totalCount !== 1 ? 's' : ''}`}
            </p>
          </div>
          {isManager && !isLogMode && (
            <div className="flex gap-2 flex-wrap">
              {!showArchived && selected.size > 0 && !confirmDelete && !confirmPermanentBulk && (
                <>
                  <Button variant="secondary" onClick={() => setConfirmDelete(true)}>
                    Archive ({selected.size})
                  </Button>
                  <Button variant="danger" onClick={() => setConfirmPermanentBulk(true)}>
                    Delete ({selected.size})
                  </Button>
                </>
              )}
              {!showArchived && selected.size > 0 && confirmDelete && (
                <>
                  <span className="self-center text-ninja-muted font-ninja text-sm font-semibold">
                    Archive {selected.size} ninja{selected.size > 1 ? 's' : ''}?
                  </span>
                  <Button variant="secondary" onClick={handleDeleteSelected} disabled={deleting}>
                    {deleting ? 'Archiving...' : 'Confirm'}
                  </Button>
                  <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                </>
              )}
              {!showArchived && selected.size > 0 && confirmPermanentBulk && (
                <>
                  <span className="self-center text-ninja-red font-ninja text-sm font-semibold">
                    Permanently delete {selected.size} ninja{selected.size > 1 ? 's' : ''}?
                  </span>
                  <Button variant="danger" onClick={handlePermanentDeleteSelected} disabled={permanentDeleting}>
                    {permanentDeleting ? 'Deleting...' : 'Confirm'}
                  </Button>
                  <Button variant="secondary" onClick={() => setConfirmPermanentBulk(false)}>Cancel</Button>
                </>
              )}
              <Button
                variant="secondary"
                onClick={() => { setShowArchived((v) => !v); setSelected(new Set()); setSearch(''); setProgramFilter(''); }}
              >
                {showArchived ? 'Active Ninjas' : 'Archived'}
              </Button>
              {!showArchived && (
                <>
                  <Button variant="secondary" onClick={() => { setImportModal(true); setImportResult(null); setImportError(''); }}>
                    Import CSV
                  </Button>
                  <Button onClick={() => navigate('/manager/students/new')}>+ Add Ninja</Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Mobile: search + chips ── */}
        <div className="lg:hidden space-y-2.5">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ninja-muted pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search ninjas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-ninja-border text-ninja-navy rounded-xl pl-9 pr-4 py-2.5 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
            {FILTER_CHIPS.map((chip) => (
              <button
                key={chip.value}
                onClick={() => setProgramFilter(chip.value)}
                className={`flex-shrink-0 text-sm font-ninja font-semibold px-4 py-1.5 rounded-full border transition-colors ${
                  programFilter === chip.value
                    ? 'bg-ninja-blue text-white border-ninja-blue'
                    : 'bg-white text-ninja-navy border-ninja-border hover:border-ninja-blue'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Mobile list ── */}
        <div className="lg:hidden bg-white border border-ninja-border rounded-xl overflow-clip shadow-sm">
          {error && <p className="text-ninja-red font-ninja text-center py-8">{error}</p>}
          {loading && <p className="text-ninja-muted font-ninja text-center py-8">Loading ninjas...</p>}
          {!loading && !error && (
            <div className="divide-y divide-ninja-border/50">
              {sorted.length === 0 && (
                <p className="text-center text-ninja-muted font-ninja py-12">No ninjas found</p>
              )}
              {sorted.map((s, i) => {
                const create = (s.programs || []).find((p) => p.program === 'CREATE');
                const belt = create?.belt_level ? getBelt(create.belt_level) : null;
                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 12) * 0.04, duration: 0.25, ease: 'easeOut' }}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-ninja-bg transition-colors"
                    onClick={() => handleRowClick(s)}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-ninja font-bold text-sm"
                      style={{ backgroundColor: getAvatarColor(s.full_name) }}
                    >
                      {getInitials(s.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-ninja font-bold text-ninja-navy truncate">{s.full_name}</p>
                      <div className="flex flex-wrap items-center gap-1 mt-0.5">
                        {(s.programs || []).map((p) => (
                          <ProgramBadge key={p.program} program={p.program} size="xs" />
                        ))}
                      </div>
                    </div>
                    {belt && (
                      <span
                        className="flex-shrink-0 text-xs font-ninja font-bold px-3 py-1 rounded-full"
                        style={{
                          backgroundColor: belt.color,
                          color: belt.textColor,
                          border: belt.name === 'White' ? '1.5px solid #d1d5db' : 'none',
                        }}
                      >
                        {belt.name} #{create.belt_sublevel}
                      </span>
                    )}
                    {isLogMode && (
                      <span className="text-ninja-blue font-ninja font-bold text-xs flex-shrink-0">Log →</span>
                    )}
                    {showArchived && isManager && (
                      <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        {confirmPermanentId === s.id ? (
                          <>
                            <button onClick={() => handlePermanentDelete(s.id)} className="text-xs font-ninja font-semibold text-white bg-ninja-red rounded-lg px-2 py-1">Yes, delete</button>
                            <button onClick={() => setConfirmPermanentId(null)} className="text-xs font-ninja text-ninja-muted">No</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleRestore(s.id)} className="text-xs font-ninja font-semibold text-green-700 border border-green-300 rounded-lg px-2 py-1 hover:bg-green-50 transition-colors">Restore</button>
                            <button onClick={() => setConfirmPermanentId(s.id)} className="text-xs font-ninja text-ninja-muted hover:text-ninja-red transition-colors">Delete</button>
                          </>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
          <div ref={mobileSentinelRef} className="h-1" />
          {loadingMore && (
            <div className="py-3 text-center text-ninja-muted font-ninja text-sm">Loading...</div>
          )}
        </div>

        {/* ── Desktop table ── */}
        <div className="hidden lg:flex lg:flex-col lg:flex-1 lg:min-h-0 lg:gap-3">
          {/* Filter + sort bar */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ninja-muted pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-white border border-ninja-border text-ninja-navy rounded-lg pl-8 pr-3 py-1.5 font-ninja text-sm focus:outline-none focus:border-ninja-blue transition-colors w-44"
              />
            </div>

            {/* Program filter chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {FILTER_CHIPS.map((chip) => (
                <button
                  key={chip.value}
                  onClick={() => setProgramFilter(chip.value)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-ninja font-bold text-xs border transition-colors ${
                    programFilter === chip.value
                      ? 'bg-ninja-blue text-white border-ninja-blue'
                      : 'bg-white text-ninja-navy border-ninja-border hover:border-ninja-blue'
                  }`}
                >
                  {chip.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    programFilter === chip.value ? 'bg-white/25 text-white' : 'bg-ninja-bg text-ninja-muted'
                  }`}>
                    {chipCounts[chip.value] ?? 0}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex-1" />

            {/* Sort */}
            <span className="font-ninja text-sm text-ninja-muted">
              Sort:{' '}
              <button
                className="font-bold text-ninja-navy hover:text-ninja-blue transition-colors"
                onClick={() => setSort(sort === 'last_active' ? 'name' : sort === 'name' ? 'joined' : 'last_active')}
              >
                {sort === 'last_active' ? 'Last session ↓' : sort === 'name' ? 'Name A–Z' : 'Newest first'}
              </button>
            </span>
          </div>

          {/* Table card */}
          <div className="bg-white border border-ninja-border rounded-2xl overflow-hidden shadow-sm flex flex-col flex-1 min-h-0">
            {error && <p className="text-ninja-red font-ninja text-center py-8">{error}</p>}
            {loading && <p className="text-ninja-muted font-ninja text-center py-8">Loading ninjas...</p>}
            {!loading && !error && (
              <>
                {/* Table head — stays pinned, rows scroll below */}
                <div className={`flex-shrink-0 grid gap-4 px-5 py-3.5 border-b border-ninja-border bg-ninja-bg font-ninja font-bold text-xs text-ninja-muted uppercase tracking-widest ${isManager && !isLogMode ? 'grid-cols-[28px_2fr_1.5fr_1.4fr_1fr_80px]' : 'grid-cols-[2fr_1.5fr_1.4fr_1fr_80px]'}`}>
                  {isManager && !isLogMode && (
                    <div>
                      <input
                        type="checkbox"
                        checked={sorted.length > 0 && selected.size === sorted.length}
                        onChange={toggleAll}
                        className="rounded border-ninja-border accent-ninja-blue cursor-pointer"
                      />
                    </div>
                  )}
                  <div>Name</div>
                  <div>Programs</div>
                  <div>Belt</div>
                  <div>Last session</div>
                  <div />
                </div>

                {/* Rows — scrollable */}
                <div className="overflow-y-auto flex-1">
                {sorted.length === 0 && (
                  <p className="text-center text-ninja-muted font-ninja py-12">No ninjas found</p>
                )}
                {sorted.map((s, i) => {
                  const create = (s.programs || []).find((p) => p.program === 'CREATE');
                  const isSelected = selected.has(s.id);
                  return (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i, 12) * 0.04, duration: 0.22, ease: 'easeOut' }}
                      onClick={() => handleRowClick(s)}
                      className={`grid gap-4 px-5 py-3.5 items-center cursor-pointer transition-colors border-b border-ninja-border/60 last:border-b-0 ${
                        isSelected ? 'bg-blue-50' : 'hover:bg-ninja-bg'
                      } ${isManager && !isLogMode ? 'grid-cols-[28px_2fr_1.5fr_1.4fr_1fr_80px]' : 'grid-cols-[2fr_1.5fr_1.4fr_1fr_80px]'}`}
                    >
                      {isManager && !isLogMode && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(s.id)}
                            className="rounded border-ninja-border accent-ninja-blue cursor-pointer"
                          />
                        </div>
                      )}

                      {/* Name + avatar */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white font-ninja font-bold text-xs"
                          style={{ backgroundColor: getAvatarColor(s.full_name) }}
                        >
                          {getInitials(s.full_name)}
                        </div>
                        <span className="font-ninja font-bold text-ninja-navy text-sm truncate">{s.full_name}</span>
                      </div>

                      {/* Programs */}
                      <div className="flex flex-wrap gap-1">
                        {(s.programs || []).map((p) => (
                          <ProgramBadge key={p.program} program={p.program} size="xs" />
                        ))}
                        {(s.programs || []).length === 0 && (
                          <span className="text-ninja-muted font-ninja text-sm italic">—</span>
                        )}
                      </div>

                      {/* Belt */}
                      <div>
                        {create?.belt_level
                          ? <BeltBadge belt={create.belt_level} sublevel={create.belt_sublevel} size="xs" />
                          : <span className="text-ninja-muted font-ninja text-sm">—</span>
                        }
                      </div>

                      {/* Last session */}
                      <div className="font-ninja text-sm text-ninja-navy font-semibold">
                        {s.last_activity ? formatDate(s.last_activity) : <span className="text-ninja-muted font-normal">Never</span>}
                      </div>

                      {/* Action */}
                      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                        {isLogMode ? (
                          <button
                            onClick={() => handleRowClick(s)}
                            className="text-xs font-ninja font-bold text-ninja-blue border border-ninja-blue rounded-lg px-3 py-1.5 hover:bg-ninja-blue hover:text-white transition-colors"
                          >
                            Log
                          </button>
                        ) : (showArchived && isManager) ? (
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {confirmPermanentId === s.id ? (
                              <>
                                <span className="text-ninja-red font-ninja text-xs">Delete?</span>
                                <button onClick={() => handlePermanentDelete(s.id)} className="text-xs font-ninja font-semibold text-white bg-ninja-red rounded-lg px-2 py-1 hover:opacity-90">Yes</button>
                                <button onClick={() => setConfirmPermanentId(null)} className="text-xs font-ninja text-ninja-muted hover:text-ninja-navy">No</button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => handleRestore(s.id)} className="text-xs font-ninja font-semibold text-green-700 border border-green-300 rounded-lg px-2 py-1.5 hover:bg-green-50 transition-colors">Restore</button>
                                <button onClick={() => setConfirmPermanentId(s.id)} className="text-xs font-ninja text-ninja-muted hover:text-ninja-red transition-colors">Delete</button>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-ninja-muted text-lg cursor-pointer hover:text-ninja-navy transition-colors">···</span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={desktopSentinelRef} className="h-1" />
                {loadingMore && (
                  <div className="py-3 text-center text-ninja-muted font-ninja text-sm">Loading...</div>
                )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* CSV Import Modal */}
      {importModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold font-ninja text-ninja-navy mb-1">Import from MyStudio CSV</h2>
            <p className="text-ninja-muted font-ninja text-sm mb-5">
              Export your membership list from MyStudio and upload it here. Programs and belt levels are auto-detected. Duplicates are skipped.
            </p>

            {!importResult && (
              <>
                {importError && (
                  <div className="bg-red-50 border border-red-200 text-ninja-red rounded-lg p-3 mb-4 text-sm font-ninja">
                    {importError}
                  </div>
                )}
                <label className={`flex flex-col items-center justify-center border-2 border-dashed border-ninja-border rounded-xl p-8 cursor-pointer hover:border-ninja-blue transition-colors ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
                  <svg className="w-8 h-8 text-ninja-muted mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span className="text-ninja-muted font-ninja text-sm">{importing ? 'Importing...' : 'Click to select CSV file'}</span>
                  <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
                </label>
              </>
            )}

            {importResult && (
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-green-700 font-ninja font-semibold text-sm">
                    ✓ {importResult.added} ninja{importResult.added !== 1 ? 's' : ''} imported successfully
                  </p>
                </div>
                {importResult.duplicates?.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-amber-700 font-ninja font-semibold text-sm mb-2">
                      {importResult.duplicates.length} duplicate{importResult.duplicates.length !== 1 ? 's' : ''} skipped:
                    </p>
                    <ul className="text-amber-700 font-ninja text-sm space-y-0.5 max-h-32 overflow-y-auto">
                      {importResult.duplicates.map((name, i) => (
                        <li key={i}>• {name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 mt-5">
              {importResult && !importing && (
                <Button variant="secondary" onClick={() => { setImportResult(null); setImportError(''); }}>
                  Import Another
                </Button>
              )}
              <Button variant={importResult ? 'primary' : 'secondary'} onClick={() => setImportModal(false)} className="ml-auto">
                {importResult ? 'Done' : 'Cancel'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
