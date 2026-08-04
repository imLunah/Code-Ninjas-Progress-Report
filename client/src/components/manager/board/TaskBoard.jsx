import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  PlusIcon, PencilIcon, Trash2Icon, ChevronLeftIcon, ChevronRightIcon,
  CalendarDaysIcon, UserIcon, XIcon,
} from 'lucide-react';
import { api } from '../../../api/client';
import LazyMarkdownEditor from '../../shared/LazyMarkdownEditor';
import Modal from '../../ui/Modal';
import { PANEL } from '../../../lib/surfaces';
import { today } from '../../../utils/dateUtils';
import {
  clamp, MD, mdUrl, shortDate, dayLabel, firstName,
  LANES, LANE_INDEX, COLUMN_SURFACE, IconButton, DiscardButton,
  splitLanes, flattenLanes,
} from './boardShared';

// Columns of cards. Work you are tracking wants a name you can scan a column
// for, a kind you can tell at a glance, and a stage, which is more than a blob
// of text can carry.

// The kinds, in the Operations Tracker's own words. Every tint is one of the
// pairs index.css carries a dark override for.
export const CATEGORIES = [
  { key: 'follow_up',      label: 'Follow up',        chip: 'bg-blue-100 text-blue-700' },
  { key: 'resume_hold',    label: 'Resume from hold', chip: 'bg-green-100 text-green-700' },
  { key: 'cancel',         label: 'Cancel',           chip: 'bg-red-100 text-red-700' },
  { key: 'submit_invoice', label: 'Submit invoice',   chip: 'bg-purple-100 text-purple-700' },
  { key: 'print',          label: 'Print request',    chip: 'bg-indigo-100 text-indigo-700' },
  // No chip: most work is just work, and a card that says "Other" says nothing.
  { key: 'other',          label: 'Other',            chip: null },
];
const categoryOf = (key) => CATEGORIES.find((c) => c.key === key) || CATEGORIES[CATEGORIES.length - 1];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const money = (n) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Everything the invoice block writes, in one place, so a blank one and a
// cleared one are the same shape.
const EMPTY_INVOICE = {
  rc_name: '', payment_processor: '', service_coordinator: '', program: '',
  service_month: '', service_year: '', order_received: '', amount: '',
};

const toInvoiceDraft = (invoice) => ({
  ...EMPTY_INVOICE,
  ...Object.fromEntries(Object.entries(invoice || {}).map(([k, v]) => [k, v ?? ''])),
});

// undefined leaves the claim alone, null deletes it. Changing a card's kind
// away from Submit invoice does NOT throw the invoice away: a mis-click on a
// dropdown should not destroy an amount somebody typed, and the block comes
// back with its contents when the kind is set back. An invoice with nothing in
// it is not an invoice, and clearing every field is how you drop one.
const invoicePayload = (draft, category) => {
  if (category !== 'submit_invoice') return undefined;
  const filled = Object.values(draft).some((v) => String(v).trim() !== '');
  return filled ? draft : null;
};

const COL_MIN_W = 264;
const COL_GAP = 16;

// Three columns of cards is the least this can be. Narrower and they stack as
// plain lists with dragging off: a drag surface on a phone fights both page
// scroll and the app's own swipe navigation.
export const LANES_MIN_W = LANES.length * COL_MIN_W + (LANES.length - 1) * COL_GAP;

// The board is a window, not a page that grows. Columns fill it and scroll
// inside themselves, so thirty cards in To do never pushes the other two
// columns off the bottom of the screen.
const BOARD_H = 'clamp(380px, calc(100dvh - 21rem), 780px)';

// How close to a column's edge the pointer has to get before that column
// starts scrolling under a held card, and how fast it goes.
const EDGE = 52;
const EDGE_SPEED = 14;

// Pointer travel before a press becomes a drag. Without it, every click on a
// card would be a one pixel drag and the board would rearrange itself when you
// only meant to read something.
const DRAG_THRESHOLD = 4;

/* ---------------------------------------------------------------- chips -- */

function CategoryChip({ category }) {
  const cat = categoryOf(category);
  if (!cat.chip) return null;
  return (
    <span className={`font-ninja text-[10px] font-bold px-2 py-0.5 rounded-full ${cat.chip}`}>
      {cat.label}
    </span>
  );
}

// Both dates are plain YYYY-MM-DD, so a string compare is a calendar compare
// and no timezone gets a say in whether something is late.
function DueChip({ due, status }) {
  const now = today();
  const done = status === 'done';
  const overdue = !done && due < now;
  const dueToday = !done && due === now;
  return (
    <span
      className={`inline-flex items-center gap-1 font-ninja text-[10px] font-bold px-2 py-0.5 rounded-full ${
        overdue ? 'bg-red-100 text-red-700'
          : dueToday ? 'bg-yellow-100 text-yellow-700'
            : 'bg-ninja-bg text-ninja-muted'
      }`}
    >
      <CalendarDaysIcon className="w-3 h-3 flex-shrink-0" strokeWidth={2.25} />
      {overdue ? `Late ${dayLabel(due)}` : dueToday ? 'Due today' : dayLabel(due)}
    </span>
  );
}

function AssigneeChip({ name }) {
  return (
    <span className="inline-flex items-center gap-1 font-ninja text-[10px] font-bold px-2 py-0.5 rounded-full bg-ninja-bg text-ninja-muted">
      <UserIcon className="w-3 h-3 flex-shrink-0" strokeWidth={2.25} />
      {firstName(name)}
    </span>
  );
}

/* ----------------------------------------------------------- card face -- */

// What a card looks like, with nothing you can do to it. Split out so the
// dashboard preview and the drag overlay show the real card rather than
// something drawn by a second piece of code that can drift.
export function TaskFace({ task }) {
  return (
    <>
      <CategoryChip category={task.category} />
      <h4 className={`font-ninja font-bold text-ninja-navy text-sm leading-snug text-pretty ${task.category !== 'other' ? 'mt-1.5' : ''}`}>
        {task.title || task.body}
      </h4>
      {task.title && task.body && (
        // A preview, not the whole thing. Opening the card is what shows the
        // rest, and a column of full descriptions is a column you scroll
        // instead of scan.
        <div
          className="font-ninja text-xs text-ninja-muted mt-1.5 break-words overflow-hidden"
          style={{ maxHeight: '3.4rem' }}
        >
          <ReactMarkdown components={MD} urlTransform={mdUrl}>{task.body}</ReactMarkdown>
        </div>
      )}

      {/* The claim in one line, in the order somebody chasing it reads: how
          much, for when, from whom. The rest is in the editor. */}
      {task.invoice && task.category === 'submit_invoice' && (
        <p className="font-ninja text-[11px] text-ninja-muted mt-1.5 truncate">
          {[
            task.invoice.amount != null ? money(task.invoice.amount) : null,
            task.invoice.service_month
              ? `${MONTHS[task.invoice.service_month - 1].slice(0, 3)} ${task.invoice.service_year || ''}`.trim()
              : null,
            task.invoice.rc_name,
          ].filter(Boolean).join(' · ')}
        </p>
      )}

      {(task.due_date || task.assignee_id || task.student_id) && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {task.due_date && <DueChip due={task.due_date} status={task.status} />}
          {task.assignee_id && <AssigneeChip name={task.assignee_name} />}
          {task.student_id && (
            // Straight to the record the task is about. A cancellation with the
            // ninja one click away is the whole reason a task knows about them.
            <Link
              to={`/manager/students/${task.student_id}`}
              className="font-ninja text-[10px] font-bold px-2 py-0.5 rounded-full bg-ninja-bg text-ninja-blue hover:underline underline-offset-2 truncate max-w-[10rem]"
            >
              {task.student_name || 'Ninja'}
            </Link>
          )}
        </div>
      )}
    </>
  );
}

/* ---------------------------------------------------------------- form -- */

// Searches rather than loading the roster: a center has hundreds of ninjas and
// a task form has no business pulling all of them down to fill one field.
function StudentPicker({ value, name, onChange, className }) {
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
      <div className="flex items-center gap-1.5">
        <span className="font-ninja text-xs font-bold text-ninja-navy bg-ninja-bg rounded-full px-2.5 py-1 truncate">
          {name || `Ninja #${value}`}
        </span>
        <IconButton onClick={() => onChange(null, null)} label="Remove ninja">
          <XIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
        </IconButton>
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
        placeholder="Link a ninja"
        aria-label="Link a ninja"
        className={className}
      />
      {open && results.length > 0 && (
        <ul className="absolute z-30 left-0 right-0 mt-1 rounded-lg border border-ninja-border bg-white shadow-lg overflow-hidden max-h-48 overflow-y-auto">
          {results.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => { onChange(s.id, s.full_name); setQuery(''); setOpen(false); }}
                className="w-full text-left font-ninja text-xs px-2.5 py-1.5 text-ninja-navy hover:bg-ninja-bg transition"
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

// Only for Submit invoice. Eight fields that exist for one kind of card is
// exactly why this is a block that appears rather than eight inputs every card
// carries empty.
function InvoiceFields({ draft, set, field }) {
  const put = (key) => (e) => set({ ...draft, [key]: e.target.value });
  return (
    <div className="rounded-lg bg-ninja-bg p-2.5 space-y-2">
      <p className="font-ninja text-[11px] font-bold text-ninja-muted uppercase tracking-wide">Invoice</p>
      <input type="text" value={draft.rc_name} onChange={put('rc_name')} placeholder="School / RC name" aria-label="School or RC name" className={`${field} w-full`} />
      <div className="grid grid-cols-2 gap-2">
        <input type="text" value={draft.payment_processor} onChange={put('payment_processor')} placeholder="Processor" aria-label="Payment processor" className={`${field} w-full`} />
        <input type="text" value={draft.service_coordinator} onChange={put('service_coordinator')} placeholder="Coordinator" aria-label="Service coordinator" className={`${field} w-full`} />
      </div>
      <input type="text" value={draft.program} onChange={put('program')} placeholder="Program" aria-label="Program" className={`${field} w-full`} />
      <div className="grid grid-cols-2 gap-2">
        <select value={draft.service_month} onChange={put('service_month')} aria-label="Month of service" className={`${field} w-full`}>
          <option value="">Month</option>
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <input type="number" value={draft.service_year} onChange={put('service_year')} placeholder="Year" aria-label="Year of service" min="2000" max="2100" className={`${field} w-full`} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input type="date" value={draft.order_received} onChange={put('order_received')} aria-label="Order received" className={`${field} w-full`} />
        <input type="number" step="0.01" min="0" value={draft.amount} onChange={put('amount')} placeholder="Amount" aria-label="Amount" className={`${field} w-full`} />
      </div>
    </div>
  );
}

// One row of the detail rail: what it is on the left, the control on the right.
// A form of stacked labelled inputs makes every field look equally important;
// this reads as a summary you can edit, which is what it is.
function DetailRow({ label, htmlFor, children }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] items-center gap-3">
      <label htmlFor={htmlFor} className="font-ninja text-sm text-ninja-muted">{label}</label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

// Creating and editing are the same dialog. They were an inline form inside a
// 264px column, which meant every field was as narrow as a card and the card
// grew to the height of a form while you used it. A task is a record; it gets
// a page-sized surface to be read and edited on.
function TaskDialog({ open, mode, task, lane, assignees, onClose, onSaved }) {
  const initial = mode === 'edit' ? task : null;
  const [title, setTitle] = useState(initial?.title || '');
  const [body, setBody] = useState(initial?.body || '');
  const [category, setCategory] = useState(initial?.category || 'other');
  const [status, setStatus] = useState(initial?.status || lane || 'todo');
  const [due, setDue] = useState(initial?.due_date || '');
  const [assignee, setAssignee] = useState(initial?.assignee_id ? String(initial.assignee_id) : '');
  const [studentId, setStudentId] = useState(initial?.student_id || null);
  const [studentName, setStudentName] = useState(initial?.student_name || null);
  const [invoice, setInvoice] = useState(() => toInvoiceDraft(initial?.invoice));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const field = 'font-ninja text-sm rounded-lg border border-ninja-border bg-white px-2.5 py-1.5 text-ninja-navy';

  // A title OR a description, matching what the server will accept. Requiring a
  // title stranded every card that came over from the old sticky wall: those
  // have a body and no title, so Save was disabled the moment you opened one.
  const canSave = !!(title.trim() || body.trim());

  const submit = async () => {
    if (!canSave || busy) return;
    setBusy(true);
    setError(null);
    const payload = {
      title,
      body,
      category,
      due_date: due || null,
      assignee_id: assignee || null,
      student_id: studentId || null,
      invoice: invoicePayload(invoice, category),
    };
    try {
      const saved = mode === 'edit'
        ? await api.patch(`/tasks/${task.id}`, payload)
        : await api.post('/tasks', { ...payload, status });
      onSaved(saved, mode !== 'edit');
      onClose();
    } catch (err) {
      setError(err?.message || 'That did not save. Try again.');
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={mode === 'edit' ? 'Task' : 'New task'}
      width="max-w-3xl"
    >
      <div className="space-y-5">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          autoFocus
          placeholder="What needs doing?"
          aria-label="Task name"
          // No box. The title IS the heading of this dialog, and a heading in a
          // bordered input reads as one more field among six.
          className="w-full font-ninja text-2xl font-black text-ninja-navy bg-transparent border-0 p-0 placeholder:text-ninja-muted placeholder:font-bold"
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_20rem] gap-6">
          <div className="space-y-4 min-w-0">
            <div className="h-56 flex flex-col min-h-0 rounded-xl border border-ninja-border px-3 py-2">
              <LazyMarkdownEditor
                variant="bare"
                value={body}
                onChange={setBody}
                placeholder="Anything the next director needs to know…"
              />
            </div>

            {/* Under the description rather than in the rail: eight fields do
                not fit a 20rem column, and a claim is detail about the work,
                not a property of it. */}
            {category === 'submit_invoice' && (
              <InvoiceFields draft={invoice} set={setInvoice} field={field} />
            )}
          </div>

          <div className="space-y-3 lg:border-l lg:border-ninja-border lg:pl-6">
            {mode !== 'edit' && (
              <DetailRow label="Column" htmlFor="task-status">
                <select id="task-status" value={status} onChange={(e) => setStatus(e.target.value)} className={`${field} w-full`}>
                  {LANES.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
                </select>
              </DetailRow>
            )}

            <DetailRow label="Kind" htmlFor="task-kind">
              <select id="task-kind" value={category} onChange={(e) => setCategory(e.target.value)} className={`${field} w-full`}>
                {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </DetailRow>

            {/* All optional. Most of what a center is carrying has no deadline,
                no single owner and no one ninja, and a form that insists on
                them gets filled with made-up ones. */}
            <DetailRow label="Due date" htmlFor="task-due">
              <input id="task-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} className={`${field} w-full`} />
            </DetailRow>

            <DetailRow label="Assigned to" htmlFor="task-assignee">
              <select id="task-assignee" value={assignee} onChange={(e) => setAssignee(e.target.value)} className={`${field} w-full`}>
                <option value="">Anyone</option>
                {assignees.map((a) => <option key={a.id} value={a.id}>{a.display_name}</option>)}
              </select>
            </DetailRow>

            <DetailRow label="Ninja">
              <StudentPicker
                value={studentId}
                name={studentName}
                onChange={(id, name) => { setStudentId(id); setStudentName(name); }}
                className={`${field} w-full`}
              />
            </DetailRow>

            {mode === 'edit' && (
              <>
                <DetailRow label="Added by">
                  <span className="font-ninja text-sm text-ninja-navy">{task.created_by_name || 'Unknown'}</span>
                </DetailRow>
                {task.completed_at && (
                  <DetailRow label="Finished">
                    <span className="font-ninja text-sm text-ninja-navy">{shortDate(task.completed_at)}</span>
                  </DetailRow>
                )}
              </>
            )}
          </div>
        </div>

        {error && <p className="font-ninja text-sm text-ninja-red">{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-1 border-t border-ninja-border">
          <button
            type="button"
            onClick={onClose}
            className="font-ninja text-sm font-bold px-4 py-2 rounded-full text-ninja-muted hover:text-ninja-navy transition mt-3"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || !canSave}
            className="font-ninja text-sm font-bold px-4 py-2 rounded-full bg-ninja-blue text-white hover:brightness-95 disabled:opacity-50 transition mt-3"
          >
            {mode === 'edit' ? 'Save changes' : 'Add task'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------------------- card -- */

function TaskCard({
  task, canManage, canReorder, canDrag, dragging,
  onBeginDrag, onMoveLane, onOpen, onDeleted, cardRef,
}) {
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);

  const lane = LANE_INDEX[task.status] ?? 0;
  const isDone = task.status === 'done';

  return (
    <motion.div
      ref={cardRef}
      layout="position"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: dragging ? 0.35 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.18 }}
      // The press starts on the card itself, but not on anything you could mean
      // to click: a drag that begins on the delete button is a delete you never
      // get to make.
      onPointerDown={(e) => {
        if (!canDrag) return;
        if (e.target.closest('button, a, input, select, textarea, [contenteditable]')) return;
        onBeginDrag(task, e);
      }}
      className={`${PANEL} p-3 ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''}`}
      style={{
        // Finished work stays legible but stops competing with the work that
        // isn't.
        opacity: isDone ? 0.75 : undefined,
        touchAction: canDrag ? 'none' : undefined,
      }}
    >
      <TaskFace task={task} />

      <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-ninja-border">
        <span className="font-ninja text-[11px] text-ninja-muted truncate">
          {isDone && task.completed_at ? `Done ${shortDate(task.completed_at)}` : task.created_by_name || 'Unknown'}
        </span>
        <div className="flex items-center gap-0.5 flex-shrink-0 text-ninja-muted">
          {/* Arrows are on the card in every layout: on a phone they are the
              only way to move a card along, and on a desk they beat dragging
              for a single step. */}
          {canReorder && !confirmDel && (
            <>
              {lane > 0 && (
                <IconButton subtle onClick={() => onMoveLane(task, -1)} label={`Move to ${LANES[lane - 1].label}`}>
                  <ChevronLeftIcon className="w-3.5 h-3.5" strokeWidth={2.25} />
                </IconButton>
              )}
              {lane < LANES.length - 1 && (
                <IconButton subtle onClick={() => onMoveLane(task, 1)} label={`Move to ${LANES[lane + 1].label}`}>
                  <ChevronRightIcon className="w-3.5 h-3.5" strokeWidth={2.25} />
                </IconButton>
              )}
            </>
          )}
          {canManage && (
            confirmDel ? (
              // The confirm keeps its word. Icons are fine for reversible
              // actions; a destructive one should never rest on the reader
              // recognising a glyph.
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await api.delete(`/tasks/${task.id}`);
                      onDeleted(task.id);
                    } catch { setBusy(false); setConfirmDel(false); }
                  }}
                  disabled={busy}
                  className="font-ninja text-[11px] font-bold px-2 py-1 rounded-full bg-red-500 text-white hover:bg-red-600 disabled:opacity-60 transition"
                >
                  Delete
                </button>
                <DiscardButton onClick={() => setConfirmDel(false)} label="Keep task" />
              </div>
            ) : (
              <>
                <IconButton subtle onClick={() => onOpen(task)} label="Open task">
                  <PencilIcon className="w-3.5 h-3.5" strokeWidth={2.25} />
                </IconButton>
                <IconButton subtle danger onClick={() => setConfirmDel(true)} label="Delete task">
                  <Trash2Icon className="w-3.5 h-3.5" strokeWidth={2.25} />
                </IconButton>
              </>
            )
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------ composer -- */

// Pinned under its column rather than at the end of the scroll, so adding to a
// long column doesn't mean scrolling to the bottom of it first. It opens the
// dialog on that column: a form in a 264px slot made every field as narrow as
// a card, and the card grew to the height of a form while you used it.
function AddTaskButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2 font-ninja text-sm font-semibold text-ninja-muted hover:text-ninja-navy rounded-lg px-1.5 py-1.5 transition-colors"
    >
      <PlusIcon className="w-4 h-4 flex-shrink-0" strokeWidth={2.5} />
      Add a task
    </button>
  );
}

function LaneHeading({ lane, count, id }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <h3 id={id} className="font-ninja text-sm font-bold text-ninja-navy">{lane.label}</h3>
      <span className="font-ninja text-xs text-ninja-muted tabular-nums">{count}</span>
    </div>
  );
}

/* --------------------------------------------------------------- board -- */

export default function TaskBoard({
  tasks, assignees = [], width, isReadOnly, canManage, onSaved, onDeleted, onArrange,
  visibleIds = null,
}) {
  const lanes = useMemo(() => splitLanes(tasks), [tasks]);

  // Filters hide cards from the screen, never from the record. The board draws
  // `shown` and saves `lanes`, so an arrangement written while a filter is on
  // can't drop the cards the filter is hiding.
  const shown = useMemo(() => {
    if (!visibleIds) return lanes;
    const out = {};
    for (const l of LANES) out[l.key] = lanes[l.key].filter((t) => visibleIds.has(t.id));
    return out;
  }, [lanes, visibleIds]);

  const filtered = !!visibleIds;
  const boardOn = width >= LANES_MIN_W;

  // Dragging is off while filtered. The drop position is an index into what you
  // can see, and with half the column hidden that index means nothing in the
  // list being saved. Arrows still work: a column is a column either way.
  const canDrag = boardOn && !isReadOnly && !filtered;

  const persist = useCallback((current) => {
    const grouped = splitLanes(current);
    api.patch('/tasks/reorder', {
      lanes: LANES.map((l) => ({ status: l.key, ids: grouped[l.key].map((t) => t.id) })),
    }).catch(() => { /* arrangement is corrected on next load */ });
  }, []);

  // One step along, from the card. Optimistic: the card lands in the next
  // column and the arrangement is corrected on the next load if the write
  // fails.
  const moveLane = useCallback((task, delta) => {
    const target = LANES[clamp((LANE_INDEX[task.status] ?? 0) + delta, 0, LANES.length - 1)].key;
    if (target === task.status) return;
    onArrange((prev) => {
      const rest = splitLanes(prev, task.id);
      rest[target].unshift({
        ...task,
        status: target,
        // The server stamps the real value; this is so the card doesn't sit in
        // Done with no date on it until the next fetch.
        completed_at: target === 'done' ? (task.completed_at ?? new Date().toISOString()) : null,
      });
      const next = flattenLanes(rest);
      persist(next);
      return next;
    });
  }, [onArrange, persist]);

  /* ------------------------------------------------------------- drag -- */

  // The columns scroll, which means a dragged card cannot simply be moved
  // inside one: overflow clips it the moment it leaves. So the held card is
  // drawn in an overlay over the page and the card in the list becomes its own
  // placeholder, faded, already sitting where it would land.
  const [drag, setDrag] = useState(null);
  const gesture = useRef(null);
  const pointer = useRef({ x: 0, y: 0 });
  const colRefs = useRef({});
  const cardRefs = useRef({});
  const shownRef = useRef(shown);
  shownRef.current = shown;

  // Which column is under the pointer, and where in it the card would go.
  // Measured off live rects, so a column that has been scrolled reports the
  // positions it is actually showing.
  const locate = useCallback((x, y, dragId) => {
    for (const l of LANES) {
      const el = colRefs.current[l.key];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x < r.left || x > r.right) continue;
      const items = shownRef.current[l.key].filter((t) => t.id !== dragId);
      let index = items.length;
      for (let i = 0; i < items.length; i += 1) {
        const c = cardRefs.current[items[i].id];
        if (!c) continue;
        const cr = c.getBoundingClientRect();
        // Compared against the midpoint, so a card dropped on the top half of
        // another goes above it.
        if (y < cr.top + cr.height / 2) { index = i; break; }
      }
      return { status: l.key, index };
    }
    return null;
  }, []);

  const applyMove = useCallback((dragId, target) => {
    if (!target) return;
    onArrange((prev) => {
      const moving = prev.find((t) => t.id === dragId);
      if (!moving) return prev;
      const rest = splitLanes(prev, dragId);
      const current = prev.filter((t) => t.status === target.status).findIndex((t) => t.id === dragId);
      // Already where it would land: bail before rebuilding, or every frame of
      // a stationary drag would hand React a brand new array.
      if (moving.status === target.status && current === target.index) return prev;
      rest[target.status].splice(
        target.index, 0,
        moving.status === target.status ? moving : { ...moving, status: target.status },
      );
      return flattenLanes(rest);
    });
  }, [onArrange]);

  const beginDrag = useCallback((task, e) => {
    const el = cardRefs.current[task.id];
    if (!el) return;
    const r = el.getBoundingClientRect();
    gesture.current = {
      id: task.id,
      task,
      startX: e.clientX,
      startY: e.clientY,
      ox: e.clientX - r.left,
      oy: e.clientY - r.top,
      w: r.width,
      active: false,
    };
    pointer.current = { x: e.clientX, y: e.clientY };
  }, []);

  // Everything below lives on the window rather than the card: a pointer that
  // leaves the card mid-drag still has to be followed, and the release can land
  // anywhere on the page.
  useEffect(() => {
    const onMove = (e) => {
      const g = gesture.current;
      if (!g) return;
      pointer.current = { x: e.clientX, y: e.clientY };
      if (!g.active) {
        if (Math.hypot(e.clientX - g.startX, e.clientY - g.startY) < DRAG_THRESHOLD) return;
        g.active = true;
        // Stops the browser selecting text across the board while a card is
        // being carried around.
        document.body.style.userSelect = 'none';
      }
      e.preventDefault();
      setDrag({ id: g.id, task: g.task, w: g.w, x: e.clientX - g.ox, y: e.clientY - g.oy });
      applyMove(g.id, locate(e.clientX, e.clientY, g.id));
    };

    const onUp = () => {
      const g = gesture.current;
      gesture.current = null;
      document.body.style.userSelect = '';
      setDrag(null);
      // A press that never became a drag changed nothing, so there is nothing
      // to write.
      if (g?.active) onArrange((current) => { persist(current); return current; });
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      document.body.style.userSelect = '';
    };
  }, [applyMove, locate, onArrange, persist]);

  // A column scrolls under a held card when the pointer nears its edge. Without
  // it, the bottom of a long column is somewhere you can see but never drop.
  useEffect(() => {
    if (!drag) return;
    let raf;
    const step = () => {
      const { x, y } = pointer.current;
      for (const l of LANES) {
        const el = colRefs.current[l.key];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (x < r.left || x > r.right) continue;
        if (y < r.top + EDGE) el.scrollTop -= EDGE_SPEED;
        else if (y > r.bottom - EDGE) el.scrollTop += EDGE_SPEED;
        break;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [drag]);

  // One dialog for the whole board, not one per card. Keyed on what it is
  // showing so opening a different task rebuilds its fields instead of reusing
  // the last one's draft.
  const [dialog, setDialog] = useState(null);

  const cardProps = (task) => ({
    canManage: canManage(task),
    // Moving stays deliberately NOT author-gated (the arrangement is shared),
    // so it can't ride on canManage — but it is still a write, so it goes away
    // when the center isn't ours.
    canReorder: !isReadOnly,
    canDrag,
    dragging: drag?.id === task.id,
    onBeginDrag: beginDrag,
    onMoveLane: moveLane,
    onOpen: (t) => setDialog({ mode: 'edit', task: t }),
    onDeleted,
  });

  const column = (l) => (
    <section
      key={l.key}
      className={`${COLUMN_SURFACE} rounded-2xl p-3 flex flex-col min-h-0`}
      style={boardOn ? { height: BOARD_H } : undefined}
      aria-labelledby={`lane-${l.key}`}
    >
      <div className="mb-2 px-0.5 flex-shrink-0">
        <LaneHeading lane={l} count={shown[l.key].length} id={`lane-${l.key}`} />
      </div>

      {/* The scroller. Cards sit in normal flow inside it, so a column is as
          tall as the window gives it and never as tall as its contents. */}
      <div
        ref={(el) => { colRefs.current[l.key] = el; }}
        className={`flex-1 min-h-0 space-y-2.5 ${boardOn ? 'overflow-y-auto' : ''} -mx-1 px-1`}
      >
        {shown[l.key].length === 0 ? (
          <p className="font-ninja text-xs text-ninja-muted px-0.5 py-4 text-center">Nothing here.</p>
        ) : (
          <AnimatePresence initial={false}>
            {shown[l.key].map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                cardRef={(el) => {
                  if (el) cardRefs.current[task.id] = el;
                  else delete cardRefs.current[task.id];
                }}
                {...cardProps(task)}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {!isReadOnly && (
        <div className="flex-shrink-0 pt-2">
          <AddTaskButton onClick={() => setDialog({ mode: 'new', lane: l.key })} />
        </div>
      )}
    </section>
  );

  return (
    <>
      <div
        className={boardOn ? 'grid gap-4 items-stretch' : 'space-y-5'}
        style={boardOn ? { gridTemplateColumns: `repeat(${LANES.length}, minmax(0, 1fr))` } : undefined}
      >
        {LANES.map(column)}
      </div>

      {dialog && (
        <TaskDialog
          key={dialog.mode === 'edit' ? dialog.task.id : `new-${dialog.lane}`}
          open
          mode={dialog.mode}
          task={dialog.task}
          lane={dialog.lane}
          assignees={assignees}
          onClose={() => setDialog(null)}
          onSaved={onSaved}
        />
      )}

      {/* The held card, drawn over the page so no column's overflow can clip
          it. Pointer events off, or it would sit between the cursor and every
          column it passes over. */}
      {drag && createPortal(
        <div
          className="fixed z-[60] pointer-events-none"
          style={{ left: drag.x, top: drag.y, width: drag.w, transform: 'rotate(1.5deg)' }}
        >
          <div className={`${PANEL} p-3 shadow-2xl`}>
            <TaskFace task={drag.task} />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
