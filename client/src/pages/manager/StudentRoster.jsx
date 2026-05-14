import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import Layout from '../../components/layout/Layout';
import BeltBadge from '../../components/ui/BeltBadge';
import ProgramBadge from '../../components/ui/ProgramBadge';
import Button from '../../components/ui/Button';
import { api } from '../../api/client';
import { PROGRAMS, BELTS, getBelt } from '../../utils/beltConfig';
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

const MOBILE_CHIPS = [
  { label: 'All', value: '' },
  { label: 'CREATE', value: 'CREATE' },
  { label: 'Robotics', value: 'Robotics Academy' },
  { label: 'AI', value: 'AI Academy' },
  { label: 'JR', value: 'JR' },
];

export default function StudentRoster() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');

  // Bulk delete
  const [selected, setSelected] = useState(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // CSV import
  const [importModal, setImportModal] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef(null);

  const navigate = useNavigate();
  const { user, isReadOnly } = useAuth();
  const isManager = user?.role === 'manager' && !isReadOnly;

  const loadStudents = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (programFilter) params.set('program', programFilter);
    setLoading(true);
    api.get(`/students?${params.toString()}`)
      .then((data) => { setStudents(data); setSelected(new Set()); })
      .catch(() => setError('Failed to load ninjas'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadStudents(); }, [search, programFilter, user?.activeLocation?.id]);

  const sorted = [...students].sort((a, b) => {
    if (sortBy === 'last_active') {
      if (!a.last_activity && !b.last_activity) return 0;
      if (!a.last_activity) return 1;
      if (!b.last_activity) return -1;
      return new Date(b.last_activity) - new Date(a.last_activity);
    }
    if (sortBy === 'joined') return new Date(b.created_at) - new Date(a.created_at);
    return a.full_name.localeCompare(b.full_name);
  });

  // --- Bulk delete ---
  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === sorted.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sorted.map((s) => s.id)));
    }
  };

  const handleDeleteSelected = async () => {
    setDeleting(true);
    try {
      await Promise.all([...selected].map((id) => api.delete(`/students/${id}`)));
      setConfirmDelete(false);
      setSelected(new Set());
      loadStudents();
    } catch {
      setError('Failed to delete some ninjas');
    } finally {
      setDeleting(false);
    }
  };

  // --- CSV import ---
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

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header + filters */}
        <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold font-ninja text-ninja-navy tracking-wide">
              Ninja <span className="text-ninja-blue">Roster</span>
            </h1>
            <p className="text-ninja-muted font-ninja mt-1">{students.length} active ninjas</p>
          </div>
          {isManager && (
            <div className="flex gap-2 flex-wrap">
              {selected.size > 0 && !confirmDelete && (
                <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                  Delete Selected ({selected.size})
                </Button>
              )}
              {selected.size > 0 && confirmDelete && (
                <>
                  <span className="self-center text-ninja-red font-ninja text-sm font-semibold">Remove {selected.size} ninja{selected.size > 1 ? 's' : ''}?</span>
                  <Button variant="danger" onClick={handleDeleteSelected} disabled={deleting}>
                    {deleting ? 'Deleting...' : 'Confirm'}
                  </Button>
                  <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                </>
              )}
              <Button variant="secondary" onClick={() => { setImportModal(true); setImportResult(null); setImportError(''); }}>
                Import CSV
              </Button>
              <Button onClick={() => navigate('/manager/students/new')}>
                + Add Ninja
              </Button>
            </div>
          )}
        </div>

        {/* Mobile filters: search + chips */}
        <div className="md:hidden space-y-2.5">
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
            {MOBILE_CHIPS.map((chip) => (
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

        {/* Desktop filters */}
        <div className="hidden md:flex gap-3">
          <input
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
          />
          <select
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
            className="bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
          >
            <option value="">All Programs</option>
            {PROGRAMS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
          >
            <option value="name">Name (A–Z)</option>
            <option value="last_active">Last Active</option>
            <option value="joined">Newest Members</option>
          </select>
        </div>
        </div>{/* end header */}

        <div className="bg-white border border-ninja-border rounded-xl overflow-clip shadow-sm">
          {error && <p className="text-ninja-red font-ninja text-center py-8">{error}</p>}
          {loading && <p className="text-ninja-muted font-ninja text-center py-8">Loading ninjas...</p>}
          {!loading && !error && (
            <>
              {/* Mobile list */}
              <div className="md:hidden divide-y divide-ninja-border/50">
                {sorted.length === 0 && (
                  <p className="text-center text-ninja-muted font-ninja py-12">No ninjas found</p>
                )}
                {sorted.map((s) => {
                  const create = (s.programs || []).find((p) => p.program === 'CREATE');
                  const belt = create?.belt_level ? getBelt(create.belt_level) : null;
                  const initials = getInitials(s.full_name);
                  const avatarBg = getAvatarColor(s.full_name);

                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-ninja-bg transition-colors"
                      onClick={() => navigate(`/manager/students/${s.id}`)}
                    >
                      {/* Avatar */}
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-ninja font-bold text-sm"
                        style={{ backgroundColor: avatarBg }}
                      >
                        {initials}
                      </div>

                      {/* Name + badges */}
                      <div className="flex-1 min-w-0">
                        <p className="font-ninja font-bold text-ninja-navy truncate">{s.full_name}</p>
                        <div className="flex flex-wrap items-center gap-1 mt-0.5">
                          {(s.programs || []).map((p) => (
                            <ProgramBadge key={p.program} program={p.program} size="xs" />
                          ))}
                        </div>
                      </div>

                      {/* Belt pill (CREATE only) */}
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
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block">
                <table className="w-full min-w-[640px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-ninja-border bg-ninja-bg">
                      {isManager && (
                        <th className="px-4 py-3 w-10">
                          <input
                            type="checkbox"
                            checked={sorted.length > 0 && selected.size === sorted.length}
                            onChange={toggleAll}
                            className="rounded border-ninja-border accent-ninja-blue cursor-pointer"
                          />
                        </th>
                      )}
                      <th className="text-left text-ninja-muted font-ninja font-semibold text-xs uppercase tracking-widest px-4 py-3">Name</th>
                      <th className="text-left text-ninja-muted font-ninja font-semibold text-xs uppercase tracking-widest px-4 py-3">Program</th>
                      <th className="text-left text-ninja-muted font-ninja font-semibold text-xs uppercase tracking-widest px-4 py-3">Belt</th>
                      <th className="text-left text-ninja-muted font-ninja font-semibold text-xs uppercase tracking-widest px-4 py-3">Project</th>
                      <th className="text-left text-ninja-muted font-ninja font-semibold text-xs uppercase tracking-widest px-4 py-3">Status</th>
                      <th className="text-left text-ninja-muted font-ninja font-semibold text-xs uppercase tracking-widest px-4 py-3 hidden lg:table-cell">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.length === 0 && (
                      <tr>
                        <td colSpan={isManager ? 7 : 6} className="text-center text-ninja-muted font-ninja py-12">No ninjas found</td>
                      </tr>
                    )}
                    {sorted.map((s) => (
                      <tr
                        key={s.id}
                        className={`border-b border-ninja-border/50 hover:bg-ninja-bg transition-colors ${selected.has(s.id) ? 'bg-blue-50' : ''}`}
                      >
                        {isManager && (
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selected.has(s.id)}
                              onChange={() => toggleSelect(s.id)}
                              className="rounded border-ninja-border accent-ninja-blue cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="px-4 py-3 font-ninja font-bold text-ninja-navy cursor-pointer" onClick={() => navigate(`/manager/students/${s.id}`)}>{s.full_name}</td>
                        <td className="px-4 py-3 cursor-pointer" onClick={() => navigate(`/manager/students/${s.id}`)}>
                          <div className="flex flex-wrap gap-1">
                            {(s.programs || []).map((p) => <ProgramBadge key={p.program} program={p.program} size="xs" />)}
                            {(s.programs || []).length === 0 && <span className="text-ninja-muted font-ninja text-sm">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 cursor-pointer" onClick={() => navigate(`/manager/students/${s.id}`)}>
                          {(() => {
                            const create = (s.programs || []).find((p) => p.program === 'CREATE');
                            return create?.belt_level
                              ? <BeltBadge belt={create.belt_level} sublevel={create.belt_sublevel} size="xs" />
                              : <span className="text-ninja-muted font-ninja text-sm">—</span>;
                          })()}
                        </td>
                        <td className="px-4 py-3 cursor-pointer" onClick={() => navigate(`/manager/students/${s.id}`)}>
                          <span className="text-ninja-muted font-ninja text-sm">
                            {(s.programs || []).find((p) => p.program === 'CREATE')?.current_project || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 cursor-pointer" onClick={() => navigate(`/manager/students/${s.id}`)}>
                          {(() => {
                            const status = (s.programs || []).find((p) => p.program === 'CREATE')?.project_status;
                            return status ? (
                              <span className={`text-xs font-ninja font-semibold px-2 py-0.5 rounded-md ${
                                status === 'Completed' ? 'bg-green-100 text-green-700'
                                : status === 'Working On' ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-600'
                              }`}>{status}</span>
                            ) : <span className="text-ninja-muted font-ninja text-sm">—</span>;
                          })()}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell cursor-pointer" onClick={() => navigate(`/manager/students/${s.id}`)}>
                          <span className="text-ninja-muted font-ninja text-sm">
                            {s.last_activity ? formatDate(s.last_activity) : 'Never'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
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
