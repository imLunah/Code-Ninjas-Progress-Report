import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Modal from '../ui/Modal';

const CARD =
  'rounded-2xl bg-white border border-ninja-border shadow-sm ' +
  'dark:shadow-[0_10px_34px_rgb(0_0_0/0.32)] ring-1 ring-transparent dark:ring-white/[0.05]';

// Type is free text. These are just suggestions + known colors; anything else
// falls back to a neutral chip. Avoids the pinned program hues (JR purple, VR
// teal) so calendar chips never read as a program.
export const TYPE_SUGGESTIONS = ['Game Building', 'Tournament', 'Parents Night', 'Field Trip', 'Holiday'];
const TYPE_COLOR = {
  'game building': '#2563eb',
  'tournament':    '#f59e0b',
  'parents night': '#ec4899',
  'field trip':    '#10b981',
  'holiday':       '#ef4444',
};
export const colorFor = (type) => TYPE_COLOR[(type || '').trim().toLowerCase()] || '#64748b';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad = (n) => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const todayIso = () => { const n = new Date(); return iso(n.getFullYear(), n.getMonth(), n.getDate()); };

const ChevL = (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m15 18-6-6 6-6" /></svg>);
const ChevR = (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m9 18 6-6-6-6" /></svg>);

/* ---------------------------------------------------------------- form --- */

function EventForm({ initial, canDelete, onSave, onDelete, onCancel, busy }) {
  const [title, setTitle] = useState(initial.title || '');
  const [date, setDate] = useState(initial.event_date || todayIso());
  const [time, setTime] = useState(initial.event_time || '');
  const [type, setType] = useState(initial.type || '');
  const [description, setDescription] = useState(initial.description || '');
  const [confirmDel, setConfirmDel] = useState(false);

  const canSave = title.trim() && date;
  const field = 'w-full rounded-lg border border-ninja-border bg-white px-3 py-2 font-ninja text-sm text-ninja-navy placeholder:text-ninja-muted focus:outline-none focus:border-ninja-blue transition-colors';

  return (
    <div className="space-y-4">
      <div>
        <label className="block font-ninja text-xs font-bold uppercase tracking-wide text-ninja-muted mb-1.5">Event</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200}
          placeholder="e.g. Robotics game build" className={field} autoFocus />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-ninja text-xs font-bold uppercase tracking-wide text-ninja-muted mb-1.5">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
        </div>
        <div>
          <label className="block font-ninja text-xs font-bold uppercase tracking-wide text-ninja-muted mb-1.5">Time <span className="opacity-60 normal-case font-semibold">(optional)</span></label>
          <input value={time} onChange={(e) => setTime(e.target.value)} maxLength={40}
            placeholder="e.g. 3:00 PM" className={field} />
        </div>
      </div>

      <div>
        <label className="block font-ninja text-xs font-bold uppercase tracking-wide text-ninja-muted mb-1.5">Type <span className="opacity-60 normal-case font-semibold">(optional)</span></label>
        <input value={type} onChange={(e) => setType(e.target.value)} maxLength={40}
          list="event-type-suggestions" placeholder="e.g. Game Building" className={field} />
        <datalist id="event-type-suggestions">
          {TYPE_SUGGESTIONS.map((t) => <option key={t} value={t} />)}
        </datalist>
      </div>

      <div>
        <label className="block font-ninja text-xs font-bold uppercase tracking-wide text-ninja-muted mb-1.5">Notes <span className="opacity-60 normal-case font-semibold">(optional)</span></label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={3}
          placeholder="Anything instructors should know" className={`${field} resize-none`} />
      </div>

      <div className="flex items-center justify-between pt-1">
        {canDelete ? (
          confirmDel ? (
            <div className="flex items-center gap-2">
              <button onClick={onDelete} disabled={busy}
                className="font-ninja text-sm font-bold px-3 py-2 rounded-lg bg-ninja-red text-white transition-transform duration-150 ease-[var(--ease-out)] active:scale-95">Delete</button>
              <button onClick={() => setConfirmDel(false)} className="font-ninja text-sm font-bold text-ninja-muted hover:text-ninja-navy">Keep</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDel(true)} className="font-ninja text-sm font-bold text-ninja-red hover:underline">Delete</button>
          )
        ) : <span />}

        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="font-ninja text-sm font-bold text-ninja-muted hover:text-ninja-navy px-2 py-2">Cancel</button>
          <button
            onClick={() => onSave({ title, event_date: date, event_time: time, type, description })}
            disabled={busy || !canSave}
            className="font-ninja text-sm font-bold px-4 py-2 rounded-lg bg-ninja-blue text-white transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100">
            {initial.id ? 'Save' : 'Add event'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ calendar --- */

export default function EventCalendar({ canManage = true }) {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() }; });
  const [modal, setModal] = useState(null); // { event } — add uses a bare {event_date}
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    api.get('/events')
      .then((data) => { if (alive) { setEvents(data || []); setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [user?.activeLocation?.id]);

  const byDay = useMemo(() => {
    const map = new Map();
    for (const e of events) {
      const arr = map.get(e.event_date) || [];
      arr.push(e);
      map.set(e.event_date, arr);
    }
    return map;
  }, [events]);

  const { y, m } = cursor;
  const firstWeekday = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const tIso = todayIso();

  const shift = (delta) => setCursor(({ y, m }) => {
    const d = new Date(y, m + delta, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const goToday = () => { const n = new Date(); setCursor({ y: n.getFullYear(), m: n.getMonth() }); };

  const openAdd = (dateIso) => { if (canManage) setModal({ event: { event_date: dateIso } }); };
  const openEdit = (ev) => setModal({ event: ev });

  const save = async (payload) => {
    setBusy(true);
    try {
      const editing = modal?.event?.id;
      if (editing) {
        const updated = await api.patch(`/events/${editing}`, payload);
        setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      } else {
        const created = await api.post('/events', payload);
        setEvents((prev) => [...prev, created]);
      }
      setModal(null);
    } catch { /* keep the form open */ } finally { setBusy(false); }
  };

  const remove = async () => {
    const id = modal?.event?.id;
    if (!id) return;
    setBusy(true);
    try {
      await api.delete(`/events/${id}`);
      setEvents((prev) => prev.filter((e) => e.id !== id));
      setModal(null);
    } catch { /* ignore */ } finally { setBusy(false); }
  };

  return (
    <div className={`${CARD} p-5`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-ninja font-bold text-ninja-navy text-lg">Calendar</h2>
          <p className="font-ninja text-xs text-ninja-muted">Events for staff at this center</p>
        </div>
        {canManage && (
          <button onClick={() => openAdd(tIso)}
            className="font-ninja text-sm font-bold text-ninja-blue hover:underline">+ New event</button>
        )}
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-ninja font-bold text-ninja-navy">{MONTHS[m]} {y}</h3>
        <div className="flex items-center gap-1">
          <button onClick={goToday} className="font-ninja text-xs font-bold text-ninja-muted hover:text-ninja-navy px-2.5 py-1 rounded-full hover:bg-ninja-bg transition-colors">Today</button>
          <button onClick={() => shift(-1)} aria-label="Previous month" className="w-8 h-8 flex items-center justify-center rounded-full text-ninja-muted hover:text-ninja-navy hover:bg-ninja-bg transition-[transform,background-color,color] duration-150 ease-[var(--ease-out)] active:scale-90"><ChevL className="w-4 h-4" /></button>
          <button onClick={() => shift(1)} aria-label="Next month" className="w-8 h-8 flex items-center justify-center rounded-full text-ninja-muted hover:text-ninja-navy hover:bg-ninja-bg transition-[transform,background-color,color] duration-150 ease-[var(--ease-out)] active:scale-90"><ChevR className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d) => (
          <span key={d} className="text-center font-ninja text-[11px] font-bold uppercase tracking-wide text-ninja-muted py-1">{d}</span>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`b${i}`} />;
          const dIso = iso(y, m, day);
          const dayEvents = byDay.get(dIso) || [];
          const isToday = dIso === tIso;
          return (
            <button
              key={dIso}
              onClick={() => openAdd(dIso)}
              disabled={!canManage}
              className={`group relative min-h-[68px] rounded-lg border p-1.5 text-left align-top transition-colors ${
                isToday ? 'border-ninja-blue bg-ninja-blue/5' : 'border-transparent hover:border-ninja-border'
              } ${canManage ? 'hover:bg-ninja-bg cursor-pointer' : 'cursor-default'}`}
            >
              <span className={`font-ninja text-xs font-bold ${isToday ? 'text-ninja-blue' : 'text-ninja-navy'}`}>{day}</span>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 2).map((ev) => (
                  <span
                    key={ev.id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); openEdit(ev); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); openEdit(ev); } }}
                    title={ev.title}
                    className="block truncate rounded px-1 py-0.5 font-ninja text-[10px] font-semibold text-white leading-tight cursor-pointer"
                    style={{ backgroundColor: colorFor(ev.type) }}
                  >
                    {ev.title}
                  </span>
                ))}
                {dayEvents.length > 2 && (
                  <span className="block font-ninja text-[10px] font-bold text-ninja-muted px-1">+{dayEvents.length - 2} more</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {loading && <p className="text-ninja-muted font-ninja text-sm py-3 text-center">Loading…</p>}

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal?.event?.id ? 'Edit event' : 'New event'} width="max-w-md">
        {modal && (
          <EventForm
            initial={modal.event}
            canDelete={canManage && !!modal.event.id}
            onSave={save}
            onDelete={remove}
            onCancel={() => setModal(null)}
            busy={busy}
          />
        )}
      </Modal>
    </div>
  );
}
