import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UsersIcon,
  CheckIcon,
  Loader2Icon,
  TriangleAlertIcon,
  UserRoundPlusIcon,
  SparklesIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { CARD } from '../../lib/surfaces';
import BouncingDots from '../ui/BouncingDots';
import useExpectedToday, { groupByClass, prettyTime, countNinjas } from '../../lib/useExpectedToday';

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

export default function ExpectedToday({
  date,
  onAdded,
  existingStudentIds,
  readOnly,
  // A parent that already asked for this feed passes it in rather than starting
  // a second one. The sensei panel does, because it has to know whether there is
  // anything to show before it offers to show it.
  feed,
  // Inside a dialog the surrounding card is the dialog.
  bare,
}) {
  const own = useExpectedToday(date, { enabled: !feed });
  const state = feed || own;
  const [adding, setAdding] = useState(() => new Set());
  const [accepted, setAccepted] = useState(() => new Set());

  const data = state.data;

  const checkIn = useCallback(
    async (row) => {
      if (!row.studentId || adding.has(row.studentId)) return null;
      setAdding((prev) => new Set(prev).add(row.studentId));
      try {
        const created = await api.post('/daily', {
          student_id: row.studentId,
          program: row.program || undefined,
          session_date: date,
        });
        onAdded?.(created);
        setAccepted((prev) => new Set(prev).add(row.studentId));
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
          next.delete(row.studentId);
          return next;
        });
      }
    },
    [adding, date, onAdded]
  );

  // Inside a dialog somebody opened on purpose, silence is an empty box. The
  // icon is deliberately there before the answer is, so pressing it early has to
  // land on something that says "working" rather than on nothing at all.
  if (state.loading) return bare ? <BouncingDots label="Loading today's bookings" className="py-6" /> : null;

  if (state.error) {
    return bare ? (
      <p className="font-ninja text-sm text-ninja-muted py-2">
        Could not reach MyStudio just now. It will try again shortly.
      </p>
    ) : null;
  }

  if (!data || !data.connected) {
    return bare ? (
      <p className="font-ninja text-sm text-ninja-muted py-2">
        This center is not connected to MyStudio.
      </p>
    ) : null;
  }

  if (data.status === 'expired') {
    return (
      <div className={`${CARD} p-4`}>
        <div className="flex items-start gap-2.5">
          <span aria-hidden className="mt-0.5 text-amber-600 dark:text-amber-400 flex-shrink-0">
            <TriangleAlertIcon size={17} />
          </span>
          <div className="min-w-0">
            <p className="font-ninja text-sm text-ninja-navy">
              The MyStudio connection ran out, so today's classes are not being
              pulled.
            </p>
            {/* Was a dead end that described where to go. Signing in again is
                a code from an email now, so it is worth one tap from here. */}
            <Link
              to="/account?mystudio=1"
              className="inline-block mt-1.5 font-ninja text-sm font-semibold text-ninja-blue hover:underline"
            >
              Sign in again
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const expected = data.expected || [];
  if (expected.length === 0) {
    return bare ? (
      <p className="font-ninja text-sm text-ninja-muted py-2">
        Nobody is booked in today.
      </p>
    ) : null;
  }

  // A ninja can be booked into two classes on one day, so the same person
  // appears twice. Checking them in once settles both rows, which is why this
  // asks about the student rather than the booking.
  const onBoard = (row) =>
    (row.studentId && accepted.has(row.studentId)) ||
    row.alreadyOnBoard ||
    (row.studentId && existingStudentIds?.has(row.studentId));

  const unmatched = expected.filter((r) => !r.studentId);
  const ninjaCount = countNinjas(expected);

  const groups = groupByClass(expected);

  return (
    <div className={bare ? '' : `${CARD} p-4`}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          {!bare && (
            <span
              aria-hidden
              className="w-8 h-8 rounded-xl flex items-center justify-center text-ninja-blue-ink bg-ninja-blue/10 flex-shrink-0"
            >
              <UsersIcon size={16} />
            </span>
          )}
          <div className="min-w-0">
            {!bare && (
              <p className="font-ninja text-sm font-semibold text-ninja-navy">
                Booked in MyStudio
              </p>
            )}
            <p className="font-ninja text-xs text-ninja-muted">
              {ninjaCount} {ninjaCount === 1 ? 'ninja' : 'ninjas'} across{' '}
              {data.bookedClassCount} {data.bookedClassCount === 1 ? 'class' : 'classes'}
              {unmatched.length > 0 && `, ${unmatched.length} not matched yet`}
            </p>
          </div>
        </div>

      </div>

      {/* By class, because "who is coming" is really "who is coming to what".
          A flat run of names hid the thing a sensei actually needs: which of
          them are in the four o'clock, and which turn up two hours later. */}
      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.key}>
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="font-ninja text-sm font-semibold text-ninja-navy tabular-nums">
                {prettyTime(group.startTime)}
              </span>
              <span className="font-ninja text-xs text-ninja-muted truncate">
                {group.className}
              </span>
              {group.isClub && (
                <span className="font-ninja text-[11px] text-ninja-muted rounded-full border border-ninja-border px-1.5 py-0.5 flex-shrink-0">
                  Logged in Clubs
                </span>
              )}
              <span className="font-ninja text-xs text-ninja-muted ml-auto flex-shrink-0 tabular-nums">
                {group.rows.length}
              </span>
            </div>

            <ul className="space-y-1">
              <AnimatePresence initial={false}>
                {group.rows.map((row) => {
                  const done = onBoard(row);
                  const busy = Boolean(row.studentId) && adding.has(row.studentId);
                  // A club is not a curriculum session, so it is never a
                  // check-in. Clubs live on the Clubs page with their own
                  // sessions; filing one here would put the wrong kind of
                  // attendance against a ninja.
                  const canAdd =
                    Boolean(row.studentId) && !done && !readOnly && !row.isClub;
                  // A missing roster match is only worth flagging to somebody
                  // who could act on it.
                  const needsMatch = !row.studentId && !readOnly;

                  return (
                    <motion.li
                      key={`${group.key}|${row.participantId}`}
                      layout
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                    >
                      <button
                        type="button"
                        onClick={canAdd ? () => checkIn(row) : undefined}
                        // A row for a ninja already on the board, or with no
                        // DojoLink record to attach to, is information rather
                        // than a control, so it does not pretend to be pressable.
                        disabled={!canAdd}
                        aria-label={
                          canAdd ? `Check in ${row.studentName || row.fullName}` : undefined
                        }
                        title={
                          row.isClub
                            ? 'Clubs are logged from the Clubs page, not checked in here'
                            : needsMatch
                              ? 'No matching ninja in DojoLink yet'
                              : undefined
                        }
                        // Already on the board is the resting state, not an
                        // achievement. Filling those rows green made a list of
                        // six settled ninjas look like six alarms, and drowned
                        // out the only rows that wanted anything: the ones still
                        // to check in. So done recedes and actionable stands out.
                        className={[
                          'group w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-ninja text-sm text-left transition-colors duration-150',
                          done
                            ? 'text-ninja-muted cursor-default'
                            : canAdd
                              ? 'text-ninja-navy hover:bg-ninja-blue/10 hover:text-ninja-blue'
                              : readOnly
                                // Reading, not deciding. Nothing on this row is
                                // wrong, so it reads as ordinary text.
                                ? 'text-ninja-navy cursor-default'
                                : 'text-ninja-muted cursor-default',
                        ].join(' ')}
                      >
                        {/* Fixed width whatever is in it, so the names line up
                            down the column even when a row has no glyph. */}
                        <span aria-hidden className="flex-shrink-0 w-3.5 flex justify-center">
                          {busy ? (
                            <Loader2Icon size={14} className="animate-spin" />
                          ) : done ? (
                            <CheckIcon size={14} className="text-emerald-600/70 dark:text-emerald-400/70" />
                          ) : canAdd ? (
                            // Adding a person to the board, not going somewhere.
                            // A chevron promised navigation and delivered a
                            // check-in.
                            <UserRoundPlusIcon
                              size={14}
                              className="text-ninja-muted group-hover:text-ninja-blue"
                            />
                          ) : row.isClub ? (
                            <SparklesIcon size={13} />
                          ) : needsMatch ? (
                            // Only where it means something. This used to appear
                            // on every row a viewer could not check in, which for
                            // a sensei was all of them, warning about ninjas who
                            // were perfectly fine.
                            <TriangleAlertIcon size={13} />
                          ) : null}
                        </span>
                        <span className={done ? 'truncate' : 'font-semibold truncate'}>
                          {row.studentName || row.fullName}
                        </span>
                        {row.rankName && (
                          <span className="text-xs text-ninja-muted truncate ml-auto flex-shrink-0">
                            {row.rankName}
                          </span>
                        )}
                      </button>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          </div>
        ))}
      </div>

      {!readOnly && unmatched.length > 0 && (
        <p className="font-ninja text-xs text-ninja-muted mt-4">
          Ninjas shown with a warning have no match on this center's roster yet.
          Add them to DojoLink and they will line up on the next pull.
        </p>
      )}
    </div>
  );
}
