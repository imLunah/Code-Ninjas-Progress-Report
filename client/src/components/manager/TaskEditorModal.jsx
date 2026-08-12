import { useState } from 'react';
import { ArchiveIcon, PlusIcon, Trash2Icon, XIcon } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import LazyMarkdownEditor from '../shared/LazyMarkdownEditor';
import { useAuth } from '../../context/AuthContext';
import { COLUMNS } from '../../lib/taskBoard';

const TITLE_MAX = 200;

// Create and edit are the same form. `task` null means create; `column` is the
// column a new card lands in.
export default function TaskEditorModal({ isOpen, task, directors = [], column = 'todo', onClose, onSave, onDelete, onArchive }) {
  const { user } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  // Kept, not chosen: a task's colour is no longer drawn on the board, so
  // there is nothing to pick. Carrying the stored value through an edit means
  // saving a card doesn't quietly wipe what is in the column.
  const [color, setColor] = useState('none');
  const [due, setDue] = useState('');
  const [assignee, setAssignee] = useState('');
  const [columnKey, setColumnKey] = useState(column);
  const [checklist, setChecklist] = useState([]);
  const [item, setItem] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
      setChecklist(task?.checklist ? task.checklist.map((i) => ({ ...i })) : []);
      setItem('');
      setError('');
      setSaving(false);
      setConfirming(false);
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
        checklist,
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

        <div>
          <span className="block font-ninja text-sm font-bold text-ninja-navy mb-1.5">
            Checklist
            {checklist.length > 0 && (
              <span className="ml-1.5 font-normal text-ninja-muted tabular-nums">
                {checklist.filter((i) => i.done).length}/{checklist.length}
              </span>
            )}
          </span>

          {checklist.length > 0 && (
            <ul className="mb-2 space-y-1">
              {checklist.map((it, i) => (
                <li key={i} className="flex items-center gap-2 group">
                  {/* A label around the box, so the words are the target too. */}
                  <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={it.done}
                      onChange={() => setChecklist((cs) => cs.map((c, j) => (j === i ? { ...c, done: !c.done } : c)))}
                      className="rounded border-ninja-border accent-ninja-blue cursor-pointer flex-shrink-0"
                    />
                    <span className={`font-ninja text-sm truncate ${it.done ? 'text-ninja-muted line-through' : 'text-ninja-navy'}`}>
                      {it.text}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setChecklist((cs) => cs.filter((_, j) => j !== i))}
                    aria-label={`Remove ${it.text}`}
                    className="p-1 rounded text-ninja-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-ninja-red transition-opacity flex-shrink-0"
                  >
                    <XIcon size={14} strokeWidth={2.5} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Enter adds and leaves the field ready for the next one: a
              checklist is written in one go, not one dialog at a time. */}
          <div className="flex items-center gap-2">
            <input
              value={item}
              onChange={(e) => setItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                const text = item.trim();
                if (!text || checklist.length >= 20) return;
                setChecklist((cs) => [...cs, { text, done: false }]);
                setItem('');
              }}
              placeholder={checklist.length >= 20 ? 'Twenty is the limit' : 'Add a step and press Enter'}
              disabled={checklist.length >= 20}
              aria-label="Add a checklist item"
              className="flex-1 rounded-xl bg-white border border-ninja-border focus:border-ninja-blue transition-colors px-3 py-2 font-ninja text-sm text-ninja-navy disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => {
                const text = item.trim();
                if (!text || checklist.length >= 20) return;
                setChecklist((cs) => [...cs, { text, done: false }]);
                setItem('');
              }}
              aria-label="Add checklist item"
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-ninja-border text-ninja-muted hover:text-ninja-blue hover:border-ninja-blue transition-colors flex-shrink-0"
            >
              <PlusIcon size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {error && <p className="font-ninja text-sm text-ninja-red">{error}</p>}

        {/* Archive and Delete live here now. The board's cards carry two arrows
            where a menu holding both used to be, and a card's own dialog is the
            place to look for what else can be done to it — it is also the route
            that does not need a pointer, which the board's gestures do. */}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          {task && (onArchive || onDelete) && (
            <div className="flex items-center gap-1 mr-auto">
              {onArchive && !confirming && (
                <button
                  type="button"
                  onClick={() => { onArchive(task); onClose(); }}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-ninja text-xs font-bold text-ninja-muted hover:text-ninja-navy hover:bg-ninja-bg transition-colors"
                >
                  <ArchiveIcon size={14} strokeWidth={2.25} />
                  Archive
                </button>
              )}
              {onDelete && (confirming ? (
                // The word, not a glyph, and asked before it happens. The board
                // deletes on a gesture that takes a hundred pixels of intent;
                // a button under a pointer has no such distance in it.
                <>
                  <span className="font-ninja text-xs text-ninja-muted">Delete for good?</span>
                  <button
                    type="button"
                    onClick={() => { onDelete(task); onClose(); }}
                    className="px-2.5 py-1.5 rounded-lg bg-ninja-red text-white font-ninja text-xs font-bold transition-transform duration-150 ease-[var(--ease-out)] active:scale-95"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    className="px-2.5 py-1.5 rounded-lg bg-ninja-bg text-ninja-navy font-ninja text-xs font-bold transition-transform duration-150 ease-[var(--ease-out)] active:scale-95"
                  >
                    Keep
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-ninja text-xs font-bold text-ninja-red hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  <Trash2Icon size={14} strokeWidth={2.25} />
                  Delete
                </button>
              ))}
            </div>
          )}
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
