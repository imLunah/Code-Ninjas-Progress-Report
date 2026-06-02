import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Layout from '../../components/layout/Layout';
import { api } from '../../api/client';
import { BELTS } from '../../utils/beltConfig';
import { formatDate } from '../../utils/dateUtils';

const BELT_COLOR = Object.fromEntries(BELTS.map(b => [b.name, b.color]));
const BELT_TEXT = Object.fromEntries(BELTS.map(b => [b.name, b.textColor]));
const BELT_ORDER = BELTS.map(b => b.name);

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white border border-ninja-border rounded-2xl p-4 shadow-sm">
      <p className="text-ninja-muted font-ninja text-xs uppercase tracking-wide mb-1">{label}</p>
      <p className="text-ninja-navy font-ninja font-bold text-2xl">{value}</p>
      {sub && <p className="text-ninja-muted font-ninja text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

function EnrollmentChart({ data }) {
  const total = data.reduce((s, r) => s + r.count, 0);
  const colors = { CREATE: '#006ADD', 'Robotics Academy': '#7c3aed', 'AI Academy': '#0891b2', JR: '#16a34a' };
  return (
    <div className="bg-white border border-ninja-border rounded-2xl p-5 shadow-sm">
      <h3 className="text-ninja-navy font-ninja font-bold text-base mb-4">Enrollment by Program</h3>
      <div className="space-y-3">
        {data.map(row => {
          const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
          const color = colors[row.program] || '#6b7280';
          return (
            <div key={row.program}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-ninja text-sm text-ninja-navy">{row.program}</span>
                <span className="font-ninja text-sm font-semibold text-ninja-navy">{row.count} <span className="text-ninja-muted font-normal">({pct}%)</span></span>
              </div>
              <div className="h-2 bg-ninja-bg rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ background: color }}
                />
              </div>
            </div>
          );
        })}
        {data.length === 0 && <p className="text-ninja-muted font-ninja text-sm">No enrollments yet.</p>}
      </div>
    </div>
  );
}

function BeltChart({ data }) {
  const sorted = [...data].sort((a, b) => BELT_ORDER.indexOf(a.belt_level) - BELT_ORDER.indexOf(b.belt_level));
  const max = Math.max(...sorted.map(r => r.count), 1);
  return (
    <div className="bg-white border border-ninja-border rounded-2xl p-5 shadow-sm">
      <h3 className="text-ninja-navy font-ninja font-bold text-base mb-4">Belt Distribution (CREATE)</h3>
      {sorted.length === 0 ? (
        <p className="text-ninja-muted font-ninja text-sm">No CREATE students yet.</p>
      ) : (
        <div className="flex items-end gap-2 h-28">
          {sorted.map(row => {
            const heightPct = Math.round((row.count / max) * 100);
            const bg = BELT_COLOR[row.belt_level] || '#e5e7eb';
            const text = BELT_TEXT[row.belt_level] || '#000';
            return (
              <div key={row.belt_level} className="flex-1 flex flex-col items-center gap-1">
                <span className="font-ninja text-xs font-semibold text-ninja-navy">{row.count}</span>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPct}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="w-full rounded-t-lg min-h-[4px]"
                  style={{ background: bg, border: row.belt_level === 'White' ? '1px solid #d1d5db' : 'none' }}
                />
                <span className="font-ninja text-[10px] text-ninja-muted truncate w-full text-center">{row.belt_level}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


function InactiveTable({ data }) {
  return (
    <div className="bg-white border border-ninja-border rounded-2xl p-5 shadow-sm">
      <h3 className="text-ninja-navy font-ninja font-bold text-base mb-1">No Check-Ins (Last 30 Days)</h3>
      <p className="text-ninja-muted font-ninja text-xs mb-4">{data.length} student{data.length !== 1 ? 's' : ''}</p>
      {data.length === 0 ? (
        <p className="text-ninja-muted font-ninja text-sm">All students active recently.</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {data.map(s => (
            <div key={s.id} className="flex items-center justify-between py-1.5 border-b border-ninja-border last:border-0">
              <a href={`/manager/students/${s.id}`} className="font-ninja text-sm text-ninja-navy hover:text-ninja-blue transition-colors">
                {s.full_name}
              </a>
              <span className="font-ninja text-xs text-ninja-muted">
                {s.last_session ? `Last: ${formatDate(s.last_session)}` : 'Never logged'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BeltLog({ data }) {
  return (
    <div className="bg-white border border-ninja-border rounded-2xl p-5 shadow-sm">
      <h3 className="text-ninja-navy font-ninja font-bold text-base mb-4">Belt Advancements (Last 30 Days)</h3>
      {data.length === 0 ? (
        <p className="text-ninja-muted font-ninja text-sm">No belt advancements recorded yet.</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {data.map((row, i) => (
            <div key={i} className="flex items-center gap-3 py-1.5 border-b border-ninja-border last:border-0">
              <span
                className="px-2 py-0.5 rounded-full font-ninja text-xs font-semibold"
                style={{ background: BELT_COLOR[row.belt_level_at] || '#e5e7eb', color: BELT_TEXT[row.belt_level_at] || '#000', border: row.belt_level_at === 'White' ? '1px solid #d1d5db' : 'none' }}
              >
                {row.belt_level_at}
              </span>
              <span className="font-ninja text-sm text-ninja-navy flex-1">{row.full_name}</span>
              <span className="font-ninja text-xs text-ninja-muted">{formatDate(row.session_date)} · {row.sensei_name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    api.get('/reports/overview')
      .then(d => setData(d))
      .catch(e => setError(e?.message || 'Failed to load report data'))
      .finally(() => setLoading(false));
  }, []);

  const totalStudents = data?.enrollment.reduce((s, r) => s + r.count, 0) ?? 0;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-ninja-navy font-ninja font-bold text-2xl">Reports</h1>
          <p className="text-ninja-muted font-ninja text-sm mt-0.5">Enrollment and activity overview</p>
        </div>

        {loading && <p className="text-ninja-muted font-ninja text-center py-12">Loading…</p>}
        {error && <p className="text-ninja-red font-ninja text-center py-12">{error}</p>}

        {data && (
          <div className="space-y-5">
            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard label="Total Students" value={totalStudents} />
              <StatCard label="Programs" value={data.enrollment.length} />
              <StatCard label="Inactive 30d" value={data.inactive.length} sub="no check-in" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EnrollmentChart data={data.enrollment} />
              <BeltChart data={data.belts} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InactiveTable data={data.inactive} />
              <BeltLog data={data.beltLog} />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
