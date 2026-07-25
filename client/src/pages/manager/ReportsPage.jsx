import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Layout from '../../components/layout/Layout';
import { api } from '../../api/client';
import { BELTS, PROGRAM_LOGOS } from '../../utils/beltConfig';
import { formatDate } from '../../utils/dateUtils';
import BeltIcon from '../../components/ui/BeltIcon';

const BELT_COLOR = Object.fromEntries(BELTS.map(b => [b.name, b.color]));
const BELT_TEXT = Object.fromEntries(BELTS.map(b => [b.name, b.textColor]));
const BELT_ORDER = BELTS.map(b => b.name);

const ENROLLMENT_COLORS = { CREATE: '#006ADD', 'Robotics Academy': '#7c3aed', 'AI Academy': '#0891b2', JR: '#16a34a', 'VR Coding': '#14b8a6' };

function StatCard({ label, value, sub, accent = '#006ADD' }) {
  return (
    <div className="bg-white border border-ninja-border rounded-2xl p-4 shadow-sm">
      <p className="text-ninja-muted font-ninja text-xs uppercase tracking-wide mb-1">{label}</p>
      <p className="font-ninja font-black text-3xl leading-none" style={{ color: accent }}>{value}</p>
      {sub && <p className="text-ninja-muted font-ninja text-xs mt-1">{sub}</p>}
    </div>
  );
}

function EnrollmentChart({ data }) {
  const total = data.reduce((s, r) => s + r.count, 0);
  const max = Math.max(...data.map(r => r.count), 1);
  const top = data.reduce((m, r) => (r.count > m.count ? r : m), { count: -1 });
  const colors = ENROLLMENT_COLORS;
  return (
    <div className="bg-white border border-ninja-border rounded-2xl p-5 shadow-sm">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-ninja-navy font-ninja font-bold text-base">Enrollment by Program</h3>
        <span className="font-ninja text-xs text-ninja-muted">{total} enrolled</span>
      </div>
      <div className="space-y-3">
        {data.map((row, i) => {
          const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
          const widthPct = Math.round((row.count / max) * 100);
          const color = colors[row.program] || '#6b7280';
          const logo = PROGRAM_LOGOS[row.program];
          const isTop = row.program === top.program;
          return (
            <motion.div
              key={row.program}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(i * 0.05, 0.3), ease: 'easeOut' }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-2 min-w-0">
                  {logo && <img src={logo} alt="" draggable={false} className="w-5 h-5 object-contain shrink-0" />}
                  <span className="font-ninja text-sm text-ninja-navy truncate">{row.program}</span>
                </span>
                <span className="font-ninja text-sm font-semibold text-ninja-navy shrink-0">{row.count} <span className="text-ninja-muted font-normal">({pct}%)</span></span>
              </div>
              <div className="h-2.5 bg-ninja-bg rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPct}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="h-full rounded-full min-w-[6px]"
                  style={{ background: color, boxShadow: isTop ? `0 0 0 2px ${color}33` : 'none' }}
                />
              </div>
            </motion.div>
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
  const total = sorted.reduce((s, r) => s + r.count, 0);
  const top = sorted.reduce((m, r) => (r.count > m.count ? r : m), { count: -1 });
  return (
    <div className="bg-white border border-ninja-border rounded-2xl p-5 shadow-sm">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-ninja-navy font-ninja font-bold text-base">Belt Distribution (CREATE)</h3>
        <span className="font-ninja text-xs text-ninja-muted">{total} ninja{total === 1 ? '' : 's'}</span>
      </div>
      {sorted.length === 0 ? (
        <p className="text-ninja-muted font-ninja text-sm">No CREATE students yet.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((row, i) => {
            const widthPct = Math.round((row.count / max) * 100);
            const bg = BELT_COLOR[row.belt_level] || '#e5e7eb';
            const isTop = row.belt_level === top.belt_level;
            return (
              <motion.div
                key={row.belt_level}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.4), ease: 'easeOut' }}
                className="flex items-center gap-2.5"
              >
                <BeltIcon belt={row.belt_level} size={26} className="shrink-0" />
                <span className="font-ninja text-xs text-ninja-navy w-16 shrink-0">{row.belt_level}</span>
                <div className="flex-1 h-5 bg-ninja-bg rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="h-full rounded-full min-w-[6px]"
                    style={{ background: bg, border: row.belt_level === 'White' ? '1px solid #d1d5db' : 'none' }}
                  />
                </div>
                <span className={`font-ninja text-sm w-7 text-right shrink-0 ${isTop ? 'font-bold text-ninja-blue' : 'font-semibold text-ninja-navy'}`}>{row.count}</span>
              </motion.div>
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
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-ninja-navy font-ninja font-bold text-base">Belt Advancements</h3>
        <span className="font-ninja text-xs text-ninja-muted">Last 30 days</span>
      </div>
      {data.length === 0 ? (
        <p className="text-ninja-muted font-ninja text-sm">No belt advancements recorded yet.</p>
      ) : (
        <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
          {data.map((row, i) => (
            <motion.div
              key={`${row.full_name}-${row.session_date}-${row.belt_level_at}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3), ease: 'easeOut' }}
              className="flex items-center gap-3 py-2 border-b border-ninja-border last:border-0"
            >
              <BeltIcon belt={row.belt_level_at} size={30} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-ninja text-sm text-ninja-navy truncate">{row.full_name}</p>
                <p className="font-ninja text-xs text-ninja-muted truncate">Earned {row.belt_level_at}{row.belt_sublevel_at ? ` · Lv ${row.belt_sublevel_at}` : ''}</p>
              </div>
              <span className="font-ninja text-xs text-ninja-muted text-right shrink-0">{formatDate(row.session_date)}<br />{row.sensei_name}</span>
            </motion.div>
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

  const totalStudents = data?.totalStudents ?? data?.enrollment.reduce((s, r) => s + r.count, 0) ?? 0;

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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Students" value={totalStudents} accent="#006ADD" />
              <StatCard label="Programs" value={data.enrollment.length} accent="#16a34a" />
              <StatCard label="Belt-Ups 30d" value={data.beltLog.length} sub="recent advancements" accent="#d4af37" />
              <StatCard label="Inactive 30d" value={data.inactive.length} sub="no check-in" accent="#f4795b" />
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
