import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import Modal from '../../components/ui/Modal';
import LazyMarkdownEditor from '../../components/shared/LazyMarkdownEditor';
import { Skeleton } from '../../components/ui/Skeleton';
import { CARD } from '../../lib/surfaces';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

// Columns are how far along the work is. Categories are what kind of work it
// is, and they are tags rather than columns on purpose: a board that grows a
// new column every time a new kind of request turns up stops being a board.
const COLUMNS = [
  { key: 'todo',  label: 'To do' },
  { key: 'doing', label: 'In progress' },
  { key: 'done',  label: 'Done' },
];

// Every tint here is one of the pairs index.css carries a dark override for, so
// the badges stay legible in dark mode without inline colour.
const CATEGORIES = [
  { key: 'cancellation', label: 'Cancellation',  badge: 'bg-red-100 text-red-700' },
  { key: 'reenrollment', label: 'Re-enrollment', badge: 'bg-green-100 text-green-700' },
  { key: 'print',        label: 'Print request', badge: 'bg-indigo-100 text-indigo-700' },
  { key: 'other',        label: 'Other',         badge: 'bg-ninja-bg text-ninja-muted' },
];

const categoryOf = (key) => CATEGORIES.find((c) => c.key === key) || CATEGORIES[3];

// Details are markdown, same editor as every other note surface. Images stay
// off: CSP allows wildcard Supabase for img-src, so a remote image in shared
// text is an open-time beacon.
const TASK_MD = {
  p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="list-disc marker:opacity-50 pl-4 mb-1.5 last:mb-0 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal marker:opacity-50 pl-4 mb-1.5 last:mb-0 space-y-0.5">{children}</ol>,
  li: ({ children }) => <li className="leading-snug">{children}</li>,
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-2">{children}</a>,
  img: () => null,
  h1: ({ children }) => <p className="font-bold mb-1.5">{children}</p>,
  h2: ({ children }) => <p className="font-bold mb-1.5">{children}</p>,
  h3: ({ children }) => <p className="font-bold mb-1.5">{children}</p>,
};

const mdUrl = (url) => (/^(https?:|mailto:)/i.test(url) ? url : '');

const shortDate = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/* --------------------------------------------------------- ninja picker -- */

// Searches rather than loading the roster: a center has hundreds of ninjas and
// a task form has no business pulling all of them down to fill one dropdown.
function StudentPicker({ value, name, onChange }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    let alive = true;
    const t = setTimeout(() => {
      api.get(`/students?search=${encodeURIComponent(query.trim())}&limit=6`)
        .then((data) => { if (alive) setResults(data?.students || []); })
        .catch(() => { if (alive) setResults([]); });
    }, 200);
    return () => { alive = false; clearTimeout(t); };
  }, [query]);

  // Clicking a result blurs the input, so closing on blur alone would drop the
  // click before it landed.
  useEffect(() => {
    const onDown = (e) => { if (!boxRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  if (value) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-ninja text-sm font-semibold text-ninja-navy bg-ninja-bg rounded-full px-3 py-1.5">
          {name || `Ninja #${value}`}
        </span>
        <button
          type="button"
          onClick={() => onChange(null, null)}
          title="Remove ninja"
          aria-label="Remove ninja"
          className="w-7 h-7 rounded-full flex items-center justify-center text-ninja-muted hover:text-ninja-navy hover:bg-ninja-bg transition"
        >
          <XIcon className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </div>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search a ninja by name"
        className="w-full font-ninja text-sm rounded-lg border border-ninja-border bg-white px-3 py-2 text-ninja-navy placeholder:text-ninja-muted"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-20 left-0 right-0 mt-1 rounded-lg border border-ninja-border bg-white shadow-lg overflow-hidden max-h-56 overflow-y-auto">
          {results.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => { onChange(s.id, s.full_name); setQuery(''); setOpen(false); }}
                className="w-full text-left font-ninja text-sm px-3 py-2 text-ninja-navy hover:bg-ninja-bg transition"
              >
                {s.full_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- form -- */

function TaskForm({ task, onSaved, onCancel }) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [body, setBody] = useState(task?.body ?? '');
  const [category, setCategory] = useState(task?.category ?? 'other');
  const [studentId, setStudentId] = useState(task?.student_id ?? null);
  const [studentName, setStudentName] = useState(task?.student_name ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    setError(null);
    const payload = { title, body, category, student_id: studentId };
    try {
      const saved = task
        ? await api.patch(`/tasks/${task.id}`, payload)
        : await api.post('/tasks', payload);
      onSaved(saved, !task);
    } catch (err) {
      setError(err?.message || 'That did not save. Try again.');
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="task-title" className="block font-ninja text-sm font-semibold text-ninja-navy mb-1.5">
          What needs doing
        </label>
        <input
          id="task-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          autoFocus
          placeholder="Print the belt certificates for Saturday"
          className="w-full font-ninja rounded-lg border border-ninja-border bg-white px-3 py-2 text-ninja-navy placeholder:text-ninja-muted"
        />
      </div>

      <div>
        <span className="block font-ninja text-sm font-semibold text-ninja-navy mb-1.5">Kind of task</span>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              aria-pressed={category === c.key}
              className={`font-ninja text-sm font-semibold px-3 py-1.5 rounded-full transition ${
                category === c.key ? 'bg-ninja-blue text-white' : 'bg-ninja-bg text-ninja-muted hover:text-ninja-navy'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="block font-ninja text-sm font-semibold text-ninja-navy mb-1.5">
          Ninja <span className="font-normal text-ninja-muted">(optional)</span>
        </span>
        <StudentPicker
          value={studentId}
          name={studentName}
          onChange={(id, name) => { setStudentId(id); setStudentName(name); }}
        />
      </div>

      <div>
        <span className="block font-ninja text-sm font-semibold text-ninja-navy mb-1.5">
          Details <span className="font-normal text-ninja-muted">(optional)</span>
        </span>
        <LazyMarkdownEditor value={body} onChange={setBody} placeholder="Anything the next director needs to know…" />
      </div>

      {error && <p className="font-ninja text-sm text-ninja-red">{error}</p>}

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="font-ninja text-sm font-bold px-4 py-2 rounded-full text-ninja-muted hover:text-ninja-navy transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy || !title.trim()}
          className="font-ninja text-sm font-bold px-4 py-2 rounded-full bg-ninja-blue text-white hover:brightness-95 disabled:opacity-50 transition"
        >
          {task ? 'Save changes' : 'Add task'}
        </button>
      </div>
    </form>
  );
}

/* ----------------------------------------------------------------- card -- */

function CardAction({ onClick, label, danger, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`w-7 h-7 rounded-full flex items-center justify-center text-ninja-muted opacity-70 transition hover:opacity-100 ${
        danger ? 'hover:bg-red-500 hover:text-white' : 'hover:bg-ninja-bg hover:text-ninja-navy'
      }`}
    >
      {children}
    </button>
  );
}

function TaskCard({ task, canManage, onMove, onEdit, onDeleted }) {
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);
  const cat = categoryOf(task.category);
  const col = COLUMNS.findIndex((c) => c.key === task.status);

  const move = (delta) => onMove(task, COLUMNS[col + delta].key);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className={`${CARD} p-3.5`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`font-ninja text-[11px] font-bold px-2 py-0.5 rounded-full ${cat.badge}`}>
          {cat.label}
        </span>
        {task.status === 'done' && task.completed_at && (
          <span className="font-ninja text-[11px] text-ninja-muted flex-shrink-0">
            {shortDate(task.completed_at)}
          </span>
        )}
      </div>

      <h3 className={`font-ninja font-bold text-ninja-navy mt-2 text-pretty ${task.status === 'done' ? 'opacity-60' : ''}`}>
        {task.title}
      </h3>

      {task.student_id && (
        // Straight to the record the task is about. A cancellation with the
        // ninja one click away is the whole reason tasks know about ninjas.
        <Link
          to={`/manager/students/${task.student_id}`}
          className="inline-block font-ninja text-xs font-semibold text-ninja-blue mt-1.5 hover:underline underline-offset-2"
        >
          {task.student_name || 'View ninja'}
        </Link>
      )}

      {task.body && (
        <div className="font-ninja text-sm text-ninja-muted mt-2 break-words">
          <ReactMarkdown components={TASK_MD} urlTransform={mdUrl}>{task.body}</ReactMarkdown>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-ninja-border">
        <span className="font-ninja text-[11px] text-ninja-muted truncate">
          {task.created_by_name || 'Unknown'}
        </span>

        {canManage && (
          confirmDel ? (
            // Destructive confirm keeps its word. Icons are fine for the
            // reversible actions around it.
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await api.delete(`/tasks/${task.id}`);
                    onDeleted(task.id);
                  } catch { setBusy(false); setConfirmDel(false); }
                }}
                className="font-ninja text-[11px] font-bold px-2 py-1 rounded-full bg-red-500 text-white hover:bg-red-600 disabled:opacity-60 transition"
              >
                Delete
              </button>
              <CardAction onClick={() => setConfirmDel(false)} label="Keep task">
                <XIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
              </CardAction>
            </div>
          ) : (
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {col > 0 && (
                <CardAction onClick={() => move(-1)} label={`Move to ${COLUMNS[col - 1].label}`}>
                  <ChevronLeftIcon className="w-4 h-4" strokeWidth={2.25} />
                </CardAction>
              )}
              {col < COLUMNS.length - 1 && (
                <CardAction onClick={() => move(1)} label={`Move to ${COLUMNS[col + 1].label}`}>
                  <ChevronRightIcon className="w-4 h-4" strokeWidth={2.25} />
                </CardAction>
              )}
              <CardAction onClick={() => onEdit(task)} label="Edit task">
                <PencilIcon className="w-3.5 h-3.5" strokeWidth={2.25} />
              </CardAction>
              <CardAction onClick={() => setConfirmDel(true)} label="Delete task" danger>
                <Trash2Icon className="w-3.5 h-3.5" strokeWidth={2.25} />
              </CardAction>
            </div>
          )
        )}
      </div>
    </motion.li>
  );
}

/* ----------------------------------------------------------------- page -- */

export default function TasksPage() {
  const { user, isReadOnly } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null); // task object, or 'new'

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.get('/tasks')
      .then((data) => { if (alive) { setTasks(data || []); setLoading(false); } })
      .catch(() => { if (alive) { setTasks([]); setLoading(false); } });
    return () => { alive = false; };
  }, [user?.activeLocation?.id]);

  const visible = useMemo(
    () => (filter === 'all' ? tasks : tasks.filter((t) => t.category === filter)),
    [tasks, filter],
  );

  const byColumn = useMemo(
    () => COLUMNS.map((c) => ({ ...c, items: visible.filter((t) => t.status === c.key) })),
    [visible],
  );

  // Optimistic: the card slides to its new column on click and is corrected
  // from the response. A round trip before the card moves makes the board feel
  // like it is arguing with you.
  const move = async (task, status) => {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status } : t)));
    try {
      const saved = await api.patch(`/tasks/${task.id}`, { status });
      setTasks((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)));
    }
  };

  const onSaved = (saved, isNew) => {
    setTasks((prev) => (isNew ? [saved, ...prev] : prev.map((t) => (t.id === saved.id ? saved : t))));
    setEditing(null);
  };

  const canManage = !isReadOnly;

  return (
    <Layout>
      <div className="space-y-6">
        <header className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black font-ninja text-ninja-navy tracking-tight">Tasks</h1>
            <p className="font-ninja text-sm text-ninja-muted mt-1 text-pretty">
              Cancellations, re-enrollments, print requests and anything else this center is carrying.
              Every director here sees the same board.
            </p>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={() => setEditing('new')}
              title="Add task"
              aria-label="Add task"
              className="flex-shrink-0 w-10 h-10 rounded-full border border-ninja-border text-ninja-muted flex items-center justify-center transition-colors hover:border-ninja-blue/60 hover:text-ninja-blue"
            >
              <PlusIcon className="w-5 h-5" strokeWidth={2.5} />
            </button>
          )}
        </header>

        <div className="flex flex-wrap gap-2">
          {[{ key: 'all', label: 'Everything' }, ...CATEGORIES].map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setFilter(c.key)}
              aria-pressed={filter === c.key}
              className={`font-ninja text-sm font-semibold px-3 py-1.5 rounded-full transition-[transform,background-color,color] duration-150 ease-[var(--ease-out)] active:scale-95 ${
                filter === c.key ? 'bg-ninja-blue text-white' : 'bg-ninja-bg text-ninja-muted hover:text-ninja-navy'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {COLUMNS.map((c) => (
              <div key={c.key} className="space-y-3" aria-busy="true" aria-label={`Loading ${c.label}`}>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="h-20 w-full rounded-2xl" />
              </div>
            ))}
          </div>
        ) : (
          // Three columns on a desktop, one stack per status on a phone. Same
          // markup: a board narrowed to a single column IS the grouped list,
          // and two renders of the same data would only drift.
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            {byColumn.map((col) => (
              <section key={col.key} aria-labelledby={`col-${col.key}`}>
                <div className="flex items-baseline justify-between gap-2 mb-3">
                  <h2 id={`col-${col.key}`} className="font-ninja font-bold text-ninja-navy">{col.label}</h2>
                  <span className="font-ninja text-xs text-ninja-muted tabular-nums">{col.items.length}</span>
                </div>
                {col.items.length === 0 ? (
                  <p className="font-ninja text-sm text-ninja-muted border border-dashed border-ninja-border rounded-2xl px-3.5 py-6 text-center">
                    Nothing here.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    <AnimatePresence initial={false}>
                      {col.items.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          canManage={canManage}
                          onMove={move}
                          onEdit={setEditing}
                          onDeleted={(id) => setTasks((prev) => prev.filter((t) => t.id !== id))}
                        />
                      ))}
                    </AnimatePresence>
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Add a task' : 'Edit task'}
        width="max-w-lg"
      >
        {/* Keyed so reopening the form on a different task rebuilds its state
            instead of reusing the last one's draft. */}
        {editing && (
          <TaskForm
            key={editing === 'new' ? 'new' : editing.id}
            task={editing === 'new' ? null : editing}
            onSaved={onSaved}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
    </Layout>
  );
}
