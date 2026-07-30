import { useState } from 'react';
import { PlusIcon, XIcon, UndoIcon } from 'lucide-react';
import { api } from '../../api/client';
import ProgramBadge from '../ui/ProgramBadge';
import { PROGRAMS, BELTS, getLevels } from '../../utils/beltConfig';

// Black + bonus tracks don't use an explicit level.
const NO_LEVEL_BELTS = ['Black', 'Bronze', 'Silver', 'Platinum'];
// Only CREATE tracks a belt and a project; the others are enrollment alone.
const hasBeltFields = (program) => program === 'CREATE';

const FIELD =
  'w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 ' +
  'font-ninja text-sm focus:outline-none focus:border-ninja-blue transition-colors';

const rowFrom = (enrollment) => ({
  program: enrollment.program,
  belt_level: enrollment.belt_level || '',
  belt_sublevel: enrollment.belt_sublevel ? String(enrollment.belt_sublevel) : '',
  current_project: enrollment.current_project || '',
  project_status: enrollment.project_status || '',
});

export const toRows = (programs = []) => programs.map(rowFrom);

const same = (a, b) =>
  a.belt_level === b.belt_level &&
  a.belt_sublevel === b.belt_sublevel &&
  a.current_project === b.current_project &&
  a.project_status === b.project_status;

// The project and status are set by logging progress, not by hand, so the
// editor shows no control for them. They still travel in the payload because
// PATCH overwrites the whole enrollment: leave them out and a sensei's logged
// project is silently nulled.
const payload = (row) => ({
  belt_level: row.belt_level || null,
  belt_sublevel: row.belt_sublevel ? parseInt(row.belt_sublevel, 10) : null,
  current_project: row.current_project || null,
  project_status: row.project_status || null,
});

// Enrollment changes are staged in the editor and written here, so Cancel on
// the dialog really cancels and one Save covers the whole ninja. `enrollments`
// is the untouched server data: an unchanged row is passed straight back so
// fields the editor never sees (percent_complete and friends) survive.
export async function commitPrograms(studentId, enrollments, rows) {
  const beforeByName = new Map(enrollments.map((e) => [e.program, e]));
  const saved = [];

  for (const row of rows) {
    const before = beforeByName.get(row.program);
    if (row.__removed) {
      if (before) await api.delete(`/students/${studentId}/programs/${encodeURIComponent(row.program)}`);
      continue;
    }
    if (!before) {
      saved.push(await api.post(`/students/${studentId}/programs`, { program: row.program, ...payload(row) }));
      continue;
    }
    if (hasBeltFields(row.program) && !same(row, rowFrom(before))) {
      saved.push({
        ...before,
        ...await api.patch(`/students/${studentId}/programs/${encodeURIComponent(row.program)}`, payload(row)),
      });
      continue;
    }
    saved.push(before);
  }
  return saved;
}

export default function ProgramsEditor({ rows, setRows, disabled = false }) {
  const [adding, setAdding] = useState('');

  const patchRow = (program, patch) =>
    setRows((prev) => prev.map((r) => (r.program === program ? { ...r, ...patch } : r)));

  const available = PROGRAMS.filter((p) => !rows.some((r) => r.program === p && !r.__removed));

  const add = (program) => {
    if (!program) return;
    setRows((prev) => {
      // Re-adding something staged for removal is just an undo.
      const staged = prev.find((r) => r.program === program && r.__removed);
      if (staged) return prev.map((r) => (r.program === program ? { ...r, __removed: false } : r));
      return [...prev, { program, belt_level: '', belt_sublevel: '', current_project: '', project_status: '' }];
    });
    setAdding('');
  };

  return (
    <div className="space-y-2">
      {rows.length === 0 && (
        <p className="font-ninja text-sm text-ninja-muted">Not enrolled in anything yet.</p>
      )}

      {rows.map((row) => {
        const levels = NO_LEVEL_BELTS.includes(row.belt_level) ? [] : getLevels(row.belt_level);
        return (
          <div key={row.program}
            className={`rounded-xl border border-ninja-border p-3 transition-opacity duration-150 ${
              row.__removed ? 'opacity-50' : ''
            }`}>
            <div className="flex items-center justify-between gap-3">
              <ProgramBadge program={row.program} size="sm" />
              {row.__removed ? (
                <button type="button" onClick={() => patchRow(row.program, { __removed: false })}
                  className="flex items-center gap-1.5 font-ninja text-xs font-semibold text-ninja-blue hover:underline">
                  <UndoIcon size={14} strokeWidth={2} aria-hidden="true" />
                  Undo
                </button>
              ) : (
                <button type="button" disabled={disabled}
                  onClick={() => patchRow(row.program, { __removed: true })}
                  title={`Remove from ${row.program}`} aria-label={`Remove from ${row.program}`}
                  className="p-1 rounded-full text-ninja-muted opacity-50 hover:opacity-100 hover:text-ninja-red transition-[color,opacity] duration-150">
                  <XIcon size={16} strokeWidth={2} />
                </button>
              )}
            </div>

            {row.__removed ? (
              <p className="font-ninja text-xs text-ninja-muted mt-1.5">
                Leaves this program when you save. Progress logs stay on file.
              </p>
            ) : (
              hasBeltFields(row.program) && (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <select value={row.belt_level} disabled={disabled}
                    onChange={(e) => patchRow(row.program, { belt_level: e.target.value, belt_sublevel: '' })}
                    aria-label="Belt" className={FIELD}>
                    <option value="">Belt: none</option>
                    {BELTS.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
                  </select>
                  {levels.length > 0 && (
                    <select value={row.belt_sublevel} disabled={disabled}
                      onChange={(e) => patchRow(row.program, { belt_sublevel: e.target.value })}
                      aria-label="Level" className={FIELD}>
                      <option value="">Level: none</option>
                      {levels.map((lv) => <option key={lv} value={lv}>Level {lv}</option>)}
                    </select>
                  )}
                </div>
              )
            )}
          </div>
        );
      })}

      {available.length > 0 && (
        adding === 'open' ? (
          <select autoFocus defaultValue="" disabled={disabled}
            onChange={(e) => add(e.target.value)}
            onBlur={() => setAdding('')}
            aria-label="Program to add" className={FIELD}>
            <option value="">Pick a program…</option>
            {available.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        ) : (
          <button type="button" disabled={disabled} onClick={() => setAdding('open')}
            className="w-full flex items-center gap-2 rounded-xl border border-dashed border-ninja-border px-3 py-2.5 font-ninja text-sm text-ninja-muted hover:border-ninja-blue hover:text-ninja-blue transition-colors duration-150">
            <PlusIcon size={15} strokeWidth={2} aria-hidden="true" />
            Add a program
          </button>
        )
      )}
    </div>
  );
}
