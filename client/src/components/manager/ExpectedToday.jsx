import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UsersIcon,
  CheckIcon,
  Loader2Icon,
  TriangleAlertIcon,
  ChevronRightIcon,
} from 'lucide-react';
import { api } from '../../api/client';
import { CARD } from '../../lib/surfaces';

// Who MyStudio says is booked in today, offered as suggestions above the board.
//
// Suggestions, not check-ins. The upstream roster is a booking, and a booking is
// a plan rather than an attendance: kids no-show, swap classes and turn up on the
// wrong day. So this proposes and a human accepts. Accepting posts to the same
// /daily endpoint the manual check-in uses, so the overdue-reuse rule and the
// enrollment check stay in one place.
//
// It renders nothing at all when the center has no connection. A center that
// never opts in should not see an empty shelf explaining a feature it does not
// have.

export default function ExpectedToday({ date, onAdded, existingStudentIds, readOnly }) {
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  const [adding, setAdding] = useState(() => new Set());
  const [accepted, setAccepted] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, data: null, error: '' });
    api
      .get(`/mystudio/today?date=${date}`)
      .then((data) => {
        if (!cancelled) setState({ loading: false, data, error: '' });
      })
      .catch((err) => {
        if (!cancelled) setState({ loading: false, data: null, error: err.message || 'failed' });
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  const data = state.data;

  const checkIn = useCallback(
    async (row) => {
      if (!row.studentId || adding.has(row.participantId)) return null;
      setAdding((prev) => new Set(prev).add(row.participantId));
      try {
        const created = await api.post('/daily', {
          student_id: row.studentId,
          program: row.program || undefined,
          session_date: date,
        });
        onAdded?.(created);
        setAccepted((prev) => new Set(prev).add(row.participantId));
        // Remember the match so the next pull does not have to guess from the
        // name again. Best effort: the check-in already happened, and a failed
        // link is only a slower match tomorrow.
        if (row.match === 'name') {
          api
            .post('/mystudio/link', {
              participant_id: row.participantId,
              student_id: row.studentId,
            })
            .catch(() => {});
        }
        return created;
      } catch {
        return null;
      } finally {
        setAdding((prev) => {
          const next = new Set(prev);
          next.delete(row.participantId);
          return next;
        });
      }
    },
    [adding, date, onAdded]
  );

  // Nothing to say: no connection, an error, or a day with no bookings.
  if (state.loading || state.error) return null;
  if (!data || !data.connected) return null;

  if (data.status === 'expired') {
    return (
      <div className={`${CARD} p-4`}>
        <div className="flex items-start gap-2.5">
          <span aria-hidden className="mt-0.5 text-amber-600 dark:text-amber-400 flex-shrink-0">
            <TriangleAlertIcon size={17} />
          </span>
          <p className="font-ninja text-sm text-ninja-navy">
            The MyStudio connection ran out, so today's classes are not being
            pulled. Reconnect from your account settings to start it again.
          </p>
        </div>
      </div>
    );
  }

  const expected = data.expected || [];
  if (expected.length === 0) return null;

  const onBoard = (row) =>
    accepted.has(row.participantId) ||
    row.alreadyOnBoard ||
    (row.studentId && existingStudentIds?.has(row.studentId));

  const actionable = expected.filter((r) => r.studentId && !onBoard(r));
  const unmatched = expected.filter((r) => !r.studentId);

  const addAll = async () => {
    if (bulkBusy || actionable.length === 0) return;
    setBulkBusy(true);
    // One at a time. The same ninja can be booked into two classes and the
    // server reuses an overdue row, so parallel posts would race for it.
    for (const row of actionable) await checkIn(row);
    setBulkBusy(false);
  };

  return (
    <div className={`${CARD} p-4`}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            aria-hidden
            className="w-8 h-8 rounded-xl flex items-center justify-center text-ninja-blue-ink bg-ninja-blue/10 flex-shrink-0"
          >
            <UsersIcon size={16} />
          </span>
          <div className="min-w-0">
            <p className="font-ninja text-sm font-semibold text-ninja-navy">
              Booked in MyStudio
            </p>
            <p className="font-ninja text-xs text-ninja-muted">
              {expected.length} {expected.length === 1 ? 'ninja' : 'ninjas'} across{' '}
              {data.bookedClassCount} {data.bookedClassCount === 1 ? 'class' : 'classes'}
              {unmatched.length > 0 && `, ${unmatched.length} not matched yet`}
            </p>
          </div>
        </div>

        {!readOnly && actionable.length > 0 && (
          <button
            type="button"
            onClick={addAll}
            disabled={bulkBusy}
            className="font-ninja text-sm font-semibold rounded-lg px-3 py-1.5 bg-ninja-blue text-white transition-[transform,filter] duration-150 ease-[var(--ease-out)] hover:brightness-95 active:scale-[0.97] disabled:opacity-60"
          >
            {bulkBusy ? (
              <span className="flex items-center gap-2">
                <Loader2Icon size={14} className="animate-spin" aria-hidden />
                Checking in
              </span>
            ) : (
              `Check in all ${actionable.length}`
            )}
          </button>
        )}
      </div>

      <ul className="flex flex-wrap gap-2">
        <AnimatePresence initial={false}>
          {expected.map((row) => {
            const done = onBoard(row);
            const busy = adding.has(row.participantId);
            const canAdd = Boolean(row.studentId) && !done && !readOnly;

            return (
              <motion.li
                key={row.participantId}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
              >
                <button
                  type="button"
                  onClick={canAdd ? () => checkIn(row) : undefined}
                  // A pill for a ninja who is already on the board, or who has no
                  // DojoLink record to attach to, is information rather than a
                  // control, so it does not pretend to be pressable.
                  disabled={!canAdd}
                  aria-label={
                    canAdd
                      ? `Check in ${row.studentName || row.fullName}`
                      : undefined
                  }
                  title={
                    row.studentId
                      ? undefined
                      : 'No matching ninja in DojoLink yet'
                  }
                  className={[
                    'group flex items-center gap-2 rounded-full border pl-2.5 pr-3 py-1.5 font-ninja text-sm transition-colors duration-150',
                    done
                      ? 'border-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : canAdd
                        ? 'border-ninja-border text-ninja-navy hover:border-ninja-blue hover:text-ninja-blue'
                        : 'border-dashed border-ninja-border text-ninja-muted cursor-default',
                  ].join(' ')}
                >
                  <span aria-hidden className="flex-shrink-0">
                    {busy ? (
                      <Loader2Icon size={14} className="animate-spin" />
                    ) : done ? (
                      <CheckIcon size={14} />
                    ) : canAdd ? (
                      <ChevronRightIcon
                        size={14}
                        className="text-ninja-muted group-hover:text-ninja-blue"
                      />
                    ) : (
                      <TriangleAlertIcon size={13} />
                    )}
                  </span>
                  <span className="font-semibold truncate max-w-[11rem]">
                    {row.studentName || row.fullName}
                  </span>
                  <span className="text-xs text-ninja-muted">{row.startTime}</span>
                </button>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      {unmatched.length > 0 && (
        <p className="font-ninja text-xs text-ninja-muted mt-3">
          Ninjas shown with a dashed outline have no match on this center's roster
          yet. Add them to DojoLink and they will line up on the next pull.
        </p>
      )}
    </div>
  );
}
