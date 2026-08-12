import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import LazyMarkdownEditor from '../shared/LazyMarkdownEditor';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { COLUMNS } from '../../lib/taskBoard';

const TITLE_MAX = 200;

// Create and edit are the same form. `task` null means create; `column` is the
// column a new card lands in.
export default function TaskEditorModal({ isOpen, task, column = 'todo', onClose, onSave }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  // Kept, not chosen: a task's colour is no longer drawn on the board, so
  // there is nothing to pick. Carrying the stored value through an edit means
  // saving a card doesn't quietly wipe what is in the column.
  const [color, setColor] = useState('none');
  const [due, setDue] = useState('');
  const [assignee, setAssignee] = useState('');
  const [columnKey, setColumnKey] = useState(column);
  const [directors, setDirectors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Who is at this center is a property of the center, not of the card, so it
  // is fetched when the dialog opens rather than carried in with the task. A
  // failure leaves the list empty and the field says as much, which is better
  // than a select that silently offers nobody.
  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    api.get('/director-tasks/assignees')
      .catch(() => [])
      .then((rows) => { if (alive) setDirectors(rows || []); });
    return () => { alive = false; };
  }, [isOpen]);

  // Seeded during render, not in an effect, and only when the dialog opens on a
  // different card.
  //
  // An effect is one render too late here. Modal mounts its children on the
  // same render that opens it, and the note editor reads its content ONCE when
  // it mounts — so opening a second card would build the editor from the state
  // still holding the first card's note, and the effect that corrected the
  // state afterwards could not reach inside an editor that had already started.
  // Titles looked right and notes were a card behind, which on a board of
  // titleless cards reads as the wrong task opening altogether.
  //
  // Keyed by which card is open, so a re-render of the board underneath the
  // dialog never clobbers what is being typed, and closing re-arms it: the same
  // card opened again comes back to what was saved, not to an abandoned edit.
  const seedKey = isOpen ? String(task?.id ?? `new:${column}`) : null;
  const [seeded, setSeeded] = useState(null);
  if (seedKey !== seeded) {
    setSeeded(seedKey);
    if (isOpen) {
      setTitle(task?.title ?? '');
      setBody(task?.body ?? '');
      setColor(task?.color ?? 'none');
      setDue(task?.due_date ?? '');
      // The center is the default, including for the older cards that predate
      // this field: with no empty option to fall back to, a select showing the
      // center while the card is stored as unassigned would save one thing and
      // display another.
      setAssignee(task?.assignee_id ? String(task.assignee_id) : 'center');
      setColumnKey(task?.column_key ?? column);
      setError('');
      setSaving(false);
    }
  }

  // A card must say something, but it chooses whether that is a title or a
  // note. The server has always been the authority on this (has_content); the
  // editor agrees with it, so the titleless cards that came over from the
  // sticky wall can be opened, edited and saved instead of trapping their
  // author with a Save that never enables.
  const trimmed = title.trim();
  const hasContent = Boolean(trimmed || body.trim());

  const submit = async () => {
    if (!hasContent) { setError('Give the task a title or a note.'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave({
        title: trimmed || null,
        body: body.trim() || null,
        color,
        due_date: due || null,
        assignee_id: assignee && assignee !== 'center' ? Number(assignee) : null,
        assignee_center: assignee === 'center',
        column_key: columnKey,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Could not save the task.');
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task ? 'Edit task' : 'New task'}
      width="max-w-lg"
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="task-title" className="block font-ninja text-sm font-bold text-ninja-navy mb-1.5">
            Title
            {/* Named as optional, because it is. A card that is just a note is
                a normal card here, not a half-finished one. */}
            <span className="ml-1.5 font-normal text-ninja-muted">optional</span>
          </label>
          <input
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={TITLE_MAX}
            placeholder="Order laptops for the Friday camp"
            className="w-full rounded-xl bg-white border border-ninja-border focus:border-ninja-blue transition-colors px-3 py-2.5 font-ninja text-sm text-ninja-navy"
          />
        </div>

        <div>
          <span className="block font-ninja text-sm font-bold text-ninja-navy mb-1.5">Notes</span>
          <LazyMarkdownEditor
            value={body}
            onChange={setBody}
            placeholder="Anything the next director on shift needs to know…"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="task-due" className="block font-ninja text-sm font-bold text-ninja-navy mb-1.5">
              Due date
            </label>
            <input
              id="task-due"
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="w-full rounded-xl bg-white border border-ninja-border focus:border-ninja-blue transition-colors px-3 py-2.5 font-ninja text-sm text-ninja-navy"
            />
            {due && (
              <button
                type="button"
                onClick={() => setDue('')}
                className="mt-1.5 font-ninja text-xs text-ninja-muted hover:text-ninja-navy transition-colors"
              >
                Clear date
              </button>
            )}
          </div>

          <div>
            <label htmlFor="task-assignee" className="block font-ninja text-sm font-bold text-ninja-navy mb-1.5">
              Assigned to
            </label>
            <select
              id="task-assignee"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="w-full rounded-xl bg-white border border-ninja-border focus:border-ninja-blue transition-colors px-3 py-2.5 font-ninja text-sm text-ninja-navy"
            >
              {/* The center first and no empty option: every card belongs to
                  the center unless somebody there has taken it, which is truer
                  than an unassigned card and does not need reading between the
                  lines. */}
              <option value="center">{user?.activeLocation?.name || 'The whole center'}</option>
              <optgroup label="Center Directors">
                {directors.map((d) => (
                  <option key={d.id} value={d.id}>{d.display_name}</option>
                ))}
              </optgroup>
              {/* A card handed to someone who has since left the center would
                  otherwise show as unassigned the moment it is opened, and
                  saving would quietly drop them. */}
              {task?.assignee_id && !directors.some((d) => d.id === task.assignee_id) && (
                <option value={task.assignee_id}>{task.assignee_name || 'No longer at this center'}</option>
              )}
            </select>
          </div>

          <div>
            <label htmlFor="task-column" className="block font-ninja text-sm font-bold text-ninja-navy mb-1.5">
              Column
            </label>
            <select
              id="task-column"
              value={columnKey}
              onChange={(e) => setColumnKey(e.target.value)}
              className="w-full rounded-xl bg-white border border-ninja-border focus:border-ninja-blue transition-colors px-3 py-2.5 font-ninja text-sm text-ninja-navy"
            >
              {COLUMNS.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="font-ninja text-sm text-ninja-red">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={saving || !hasContent}>
            {saving ? 'Saving…' : task ? 'Save changes' : 'Add task'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
