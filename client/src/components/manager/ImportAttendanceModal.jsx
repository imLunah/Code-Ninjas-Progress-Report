import { useState } from 'react';
import { api } from '../../api/client';
import Modal from '../ui/Modal';
import ProgramBadge from '../ui/ProgramBadge';
import Button from '../ui/Button';
import { today } from '../../utils/dateUtils';

// Paste a Live-Ninjas-style attendance list ("First L", one per line), match each
// name to a roster ninja, resolve the program, preview, then bulk check-in. The
// board only gives first name + last initial, so duplicates/ambiguity are surfaced
// for the user to resolve — nothing is checked in until they confirm.
export default function ImportAttendanceModal({ isOpen, onClose, onAdded }) {
  const [text, setText] = useState('');
  const [rows, setRows] = useState(null);   // null = input step
  const [matching, setMatching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);

  const reset = () => {
    setText('');
    setRows(null);
    setError('');
    setSummary(null);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleMatch = async () => {
    const names = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (names.length === 0) { setError('Paste at least one name.'); return; }
    setMatching(true);
    setError('');
    try {
      const { results } = await api.post('/daily/match-attendance', { names });
      // Seed each row's selection: single candidate auto-selects; single program auto-picks.
      const seeded = results.map((r) => {
        const studentId = r.candidates.length === 1 ? r.candidates[0].id : null;
        const chosen = r.candidates.find((c) => c.id === studentId);
        const program = chosen && chosen.programs.length === 1 ? chosen.programs[0].program : null;
        return { ...r, studentId, program, include: true };
      });
      setRows(seeded);
    } catch (err) {
      setError(err.message || 'Matching failed');
    } finally {
      setMatching(false);
    }
  };

  const updateRow = (i, patch) => {
    setRows((prev) => prev.map((r, idx) => {
      if (idx !== i) return r;
      const next = { ...r, ...patch };
      // When the student changes, reset/auto-pick the program.
      if ('studentId' in patch) {
        const chosen = r.candidates.find((c) => c.id === patch.studentId);
        next.program = chosen && chosen.programs.length === 1 ? chosen.programs[0].program : null;
      }
      return next;
    }));
  };

  const chosenFor = (r) => r.candidates.find((c) => c.id === r.studentId);
  const isResolved = (r) => Boolean(r.studentId && r.program);
  const readyRows = (rows || []).filter((r) => r.include && isResolved(r));

  const handleCheckIn = async () => {
    setSubmitting(true);
    setError('');
    const result = { ok: 0, failed: [] };
    for (const r of readyRows) {
      try {
        const assignment = await api.post('/daily', {
          student_id: r.studentId,
          program: r.program,
          session_date: today(),
        });
        onAdded && onAdded(assignment);
        result.ok += 1;
      } catch (err) {
        result.failed.push({ name: r.raw, reason: err.message || 'failed' });
      }
    }
    setSummary(result);
    setSubmitting(false);
  };

  const matched = (rows || []).filter((r) => r.candidates.length > 0).length;
  const unmatched = (rows || []).filter((r) => r.candidates.length === 0).length;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Attendance" width="max-w-lg">
      {error && <p className="text-ninja-red font-ninja text-sm mb-3">{error}</p>}

      {/* Step 3: summary */}
      {summary ? (
        <div className="space-y-4">
          <div className="bg-ninja-bg border border-ninja-border rounded-xl p-4">
            <p className="text-ninja-navy font-ninja font-semibold">
              Checked in {summary.ok} ninja{summary.ok !== 1 ? 's' : ''}.
            </p>
            {summary.failed.length > 0 && (
              <div className="mt-2">
                <p className="text-ninja-red font-ninja text-sm font-semibold">{summary.failed.length} failed:</p>
                <ul className="text-ninja-muted font-ninja text-sm mt-1 space-y-0.5">
                  {summary.failed.map((f, i) => <li key={i}>{f.name} — {f.reason}</li>)}
                </ul>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={reset}>Import More</Button>
            <Button onClick={handleClose} className="ml-auto">Done</Button>
          </div>
        </div>
      ) : rows === null ? (
        /* Step 1: paste */
        <div className="space-y-3">
          <p className="text-ninja-muted font-ninja text-sm">
            Paste the attendance list, one name per line (e.g. <span className="font-mono">Aiden Z</span>).
            A trailing time like <span className="font-mono">- 16:04</span> is ignored.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder={'Grayson P\nEthan M\nMateo C - 18:05'}
            className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue resize-none"
            autoFocus
          />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleClose}>Cancel</Button>
            <Button onClick={handleMatch} disabled={matching || !text.trim()} className="ml-auto">
              {matching ? 'Matching…' : 'Match Names'}
            </Button>
          </div>
        </div>
      ) : (
        /* Step 2: resolve + preview */
        <div className="space-y-3">
          <p className="text-ninja-muted font-ninja text-sm">
            {matched} matched{unmatched ? `, ${unmatched} not found` : ''}. Resolve any duplicates / programs, then check in.
          </p>

          <div className="space-y-2 max-h-[55vh] overflow-y-auto">
            {rows.map((r, i) => {
              const none = r.candidates.length === 0;
              const chosen = chosenFor(r);
              const programs = chosen?.programs || [];
              return (
                <div
                  key={i}
                  className={`border rounded-xl p-3 ${none ? 'border-ninja-border opacity-60' : 'border-ninja-border bg-ninja-bg'}`}
                >
                  <div className="flex items-center gap-2">
                    {!none && (
                      <input
                        type="checkbox"
                        checked={r.include}
                        onChange={() => updateRow(i, { include: !r.include })}
                        className="accent-ninja-blue"
                      />
                    )}
                    <span className="text-ninja-navy font-ninja font-semibold text-sm">{r.raw}</span>
                    {none && <span className="text-ninja-red font-ninja text-xs ml-auto">No match</span>}
                  </div>

                  {!none && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 pl-6">
                      {/* Student picker — only when ambiguous */}
                      {r.candidates.length > 1 ? (
                        <select
                          value={r.studentId ?? ''}
                          onChange={(e) => updateRow(i, { studentId: Number(e.target.value) || null })}
                          className="bg-white border border-ninja-border text-ninja-navy rounded-lg px-2 py-1 font-ninja text-sm"
                        >
                          <option value="">Pick ninja…</option>
                          {r.candidates.map((c) => (
                            <option key={c.id} value={c.id}>{c.full_name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-ninja-navy font-ninja text-sm">{chosen?.full_name}</span>
                      )}

                      {/* Program picker */}
                      {chosen && (programs.length > 1 ? (
                        <select
                          value={r.program ?? ''}
                          onChange={(e) => updateRow(i, { program: e.target.value || null })}
                          className="bg-white border border-ninja-border text-ninja-navy rounded-lg px-2 py-1 font-ninja text-sm"
                        >
                          <option value="">Pick program…</option>
                          {programs.map((p) => (
                            <option key={p.program} value={p.program}>{p.program}</option>
                          ))}
                        </select>
                      ) : programs.length === 1 ? (
                        <ProgramBadge program={programs[0].program} size="xs" />
                      ) : (
                        <span className="text-ninja-red font-ninja text-xs">No program enrolled</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" onClick={reset} disabled={submitting}>Back</Button>
            <Button
              onClick={handleCheckIn}
              disabled={submitting || readyRows.length === 0}
              className="ml-auto"
            >
              {submitting ? 'Checking in…' : `Check In (${readyRows.length})`}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
