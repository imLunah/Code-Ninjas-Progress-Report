import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import LazyMarkdownEditor from '../shared/LazyMarkdownEditor';
import { COLORS, COLUMNS } from '../../lib/taskBoard';

const TITLE_MAX = 200;

// Create and edit are the same form. `task` null means create; `column` is the
// column a new card lands in.
export default function TaskEditorModal({ isOpen, task, column = 'todo', onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [color, setColor] = useState('none');
  const [due, setDue] = useState('');
  const [columnKey, setColumnKey] = useState(column);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Reseeded on open rather than on every render, so typing isn't clobbered by
  // the parent re-rendering underneath the dialog.
  useEffect(() => {
    if (!isOpen) return;
    setTitle(task?.title ?? '');
    setBody(task?.body ?? '');
    setColor(task?.color ?? 'none');
    setDue(task?.due_date ?? '');
    setColumnKey(task?.column_key ?? column);
    setError('');
    setSaving(false);
  }, [isOpen, task, column]);

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

        <div>
          <span className="block font-ninja text-sm font-bold text-ninja-navy mb-2">Colour</span>
          {/* radiogroup rather than buttons: these are one exclusive choice, and
              a screen reader should hear it as such. */}
          <div role="radiogroup" aria-label="Card colour" className="flex items-center gap-2">
            {COLORS.map((c) => {
              const active = color === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={c.label}
                  title={c.label}
                  onClick={() => setColor(c.key)}
                  className={`h-8 px-1.5 rounded-lg flex items-center justify-center transition-transform duration-150 ease-[var(--ease-out)] active:scale-90 ${
                    active ? 'ring-2 ring-ninja-blue' : ''
                  }`}
                >
                  {c.hex ? (
                    // A filled chip, not the card's own wash: at this size the
                    // wash is too faint to tell one colour from another, and a
                    // picker has to be readable before it is representative.
                    // Inline hex, since a `bg-*` utility would be rewritten by
                    // the dark overrides and stop matching the card it sets.
                    <span className="h-5 w-5 rounded-md block" style={{ backgroundColor: c.hex }} />
                  ) : (
                    <span className="h-5 w-5 rounded-md block border border-dashed border-ninja-muted" />
                  )}
                </button>
              );
            })}
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
