import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import BeltBadge from '../../components/ui/BeltBadge';
import ProgramBadge from '../../components/ui/ProgramBadge';
import Button from '../../components/ui/Button';
import { api } from '../../api/client';
import { BELTS, PROGRAMS } from '../../utils/beltConfig';
import { formatDate } from '../../utils/dateUtils';
import { useAuth } from '../../context/AuthContext';

export default function StudentRoster() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [beltFilter, setBeltFilter] = useState('');

  const navigate = useNavigate();
  const { user, isReadOnly } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (programFilter) params.set('program', programFilter);
    if (beltFilter) params.set('belt', beltFilter);

    setLoading(true);
    api.get(`/students?${params.toString()}`)
      .then(setStudents)
      .catch(() => setError('Failed to load ninjas'))
      .finally(() => setLoading(false));
  }, [search, programFilter, beltFilter, user?.activeLocation?.id]);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold font-ninja text-ninja-navy tracking-wide">
              Ninja <span className="text-ninja-blue">Roster</span>
            </h1>
            <p className="text-ninja-muted font-ninja mt-1">{students.length} active ninjas</p>
          </div>
          {user?.role === 'manager' && !isReadOnly && (
            <Button onClick={() => navigate('/manager/students/new')}>
              + Add Ninja
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
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
            value={beltFilter}
            onChange={(e) => setBeltFilter(e.target.value)}
            className="bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
          >
            <option value="">All Belts</option>
            {BELTS.map((b) => (
              <option key={b.name} value={b.name}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white border border-ninja-border rounded-xl overflow-hidden shadow-sm">
          {error && (
            <p className="text-ninja-red font-ninja text-center py-8">{error}</p>
          )}
          {loading && (
            <p className="text-ninja-muted font-ninja text-center py-8">Loading ninjas...</p>
          )}
          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-ninja-border bg-ninja-bg">
                    <th className="text-left text-ninja-muted font-ninja font-semibold text-xs uppercase tracking-widest px-4 py-3">Name</th>
                    <th className="text-left text-ninja-muted font-ninja font-semibold text-xs uppercase tracking-widest px-4 py-3">Program</th>
                    <th className="text-left text-ninja-muted font-ninja font-semibold text-xs uppercase tracking-widest px-4 py-3">Belt</th>
                    <th className="text-left text-ninja-muted font-ninja font-semibold text-xs uppercase tracking-widest px-4 py-3 hidden md:table-cell">Project</th>
                    <th className="text-left text-ninja-muted font-ninja font-semibold text-xs uppercase tracking-widest px-4 py-3 hidden md:table-cell">Status</th>
                    <th className="text-left text-ninja-muted font-ninja font-semibold text-xs uppercase tracking-widest px-4 py-3 hidden lg:table-cell">Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-ninja-muted font-ninja py-12">
                        No ninjas found
                      </td>
                    </tr>
                  )}
                  {students.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => navigate(`/manager/students/${s.id}`)}
                      className="border-b border-ninja-border/50 hover:bg-ninja-bg cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-ninja font-bold text-ninja-navy">{s.full_name}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(s.programs || []).map((p) => (
                            <ProgramBadge key={p.program} program={p.program} size="xs" />
                          ))}
                          {(s.programs || []).length === 0 && (
                            <span className="text-ninja-muted font-ninja text-sm">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const create = (s.programs || []).find((p) => p.program === 'CREATE');
                          return create?.belt_level
                            ? <BeltBadge belt={create.belt_level} sublevel={create.belt_sublevel} size="xs" />
                            : <span className="text-ninja-muted font-ninja text-sm">—</span>;
                        })()}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-ninja-muted font-ninja text-sm">
                          {(s.programs || []).find((p) => p.program === 'CREATE')?.current_project || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {(() => {
                          const status = (s.programs || []).find((p) => p.program === 'CREATE')?.project_status;
                          return status ? (
                            <span className={`text-xs font-ninja font-semibold px-2 py-0.5 rounded-md ${
                              status === 'Completed'
                                ? 'bg-green-100 text-green-700'
                                : status === 'Working On'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {status}
                            </span>
                          ) : (
                            <span className="text-ninja-muted font-ninja text-sm">—</span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-ninja-muted font-ninja text-sm">
                          {s.last_activity ? formatDate(s.last_activity) : 'Never'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
