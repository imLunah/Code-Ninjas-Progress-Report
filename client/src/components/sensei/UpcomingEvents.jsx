import { useState, useEffect, useMemo } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { CARD } from '../../lib/surfaces';
import { Skeleton } from '../ui/Skeleton';

// Local copy of the type palette (kept in sync with EventCalendar) so the sensei
// bundle doesn't pull in the calendar + Modal just for a few colors. Type is
// free text, so unknown values fall back to neutral.
const TYPE_COLOR = {
  'game building': '#2563eb',
  'tournament':    '#f59e0b',
  'parents night': '#ec4899',
  'field trip':    '#10b981',
  'holiday':       '#ef4444',
};
const colorFor = (type) => TYPE_COLOR[(type || '').trim().toLowerCase()] || '#64748b';


const pad = (n) => String(n).padStart(2, '0');
const todayIso = () => { const n = new Date(); return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`; };

// event_date arrives as a plain YYYY-MM-DD; build a LOCAL date so it doesn't
// slip a day in western timezones.
function label(dIso) {
  const [y, m, d] = dIso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const t = todayIso();
  if (dIso === t) return 'Today';
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  if (dIso === `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function UpcomingEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.get('/events')
      .then((data) => { if (alive) { setEvents(data || []); setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [user?.activeLocation?.id]);

  const upcoming = useMemo(() => {
    const t = todayIso();
    return events.filter((e) => e.event_date >= t).slice(0, 6);
  }, [events]);

  // Nothing coming up and nothing loading → don't take up dashboard space.
  if (!loading && upcoming.length === 0) return null;

  return (
    <div className={`${CARD} p-5`}>
      <h2 className="font-ninja font-bold text-ninja-navy text-lg mb-4">Upcoming events</h2>
      {loading ? (
        <div role="status" aria-busy="true" aria-label="Loading events" className="space-y-2.5"><Skeleton className="h-3.5 w-3/4" /><Skeleton className="h-3.5 w-2/3" /><Skeleton className="h-3.5 w-1/2" /></div>
      ) : (
        <ul className="space-y-3">
          {upcoming.map((e) => (
            <li key={e.id} className="flex items-start gap-3">
              <span className="mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: colorFor(e.type) }} />
              <div className="min-w-0 flex-1">
                <p className="font-ninja text-sm font-bold text-ninja-navy truncate">{e.title}</p>
                <p className="font-ninja text-xs text-ninja-muted">
                  {label(e.event_date)}{e.event_time ? ` · ${e.event_time}` : ''} · {e.type}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
