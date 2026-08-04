import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { XIcon, ChevronDownIcon } from 'lucide-react';
import { api } from '../../../api/client';
import LazyMarkdownEditor from '../../shared/LazyMarkdownEditor';
import Modal from '../../ui/Modal';
import {
  LANES, CATEGORIES, MONTHS, MD, mdUrl, shortDate, invoiceLine,
  KindTag, OwnerBadge, IconButton, DiscardButton,
} from './boardShared';

// Creating and editing are the same dialog, laid out as a property sheet: the
// title, then the task's properties as label/value rows, then the description.
// Values dress as chips sitting in the row, not as a form of boxed inputs;
// a task is a record you read, and most opens of this dialog change nothing.
//
// Who can change what mirrors the server exactly. What a task SAYS — title,
// description, kind, invoice — belongs to its author (or an admin). Who it is
// FOR, when it is due and where it stands are arrangement, and arrangement is
// shared: any director at the center can hand a task over or tick it off.

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

// undefined leaves the claim alone, null deletes it. Changing a task's kind
// away from Submit invoice does NOT throw the invoice away: a mis-click on a
// dropdown should not destroy an amount somebody typed, and the block comes
// back with its contents when the kind is set back.
const invoicePayload = (draft, category) => {
  if (category !== 'submit_invoice') return undefined;
  const filled = Object.values(draft).some((v) => String(v).trim() !== '');
  return filled ? draft : null;
};

// The chip a value wears while it is really a native select underneath: the
// menu, the keyboard and the screen reader all come free, and only the resting
// look is ours.
const CHIP = 'appearance-none font-ninja text-[13px] font-medium bg-ninja-bg rounded-md '
  + 'pl-2.5 pr-7 py-1 text-ninja-navy border-0 cursor-pointer transition-colors '
  + 'hover:bg-black/[0.06] dark:hover:bg-white/[0.08]';

function ChipSelect({ id, value, onChange, label, children }) {
  return (
    <span className="relative inline-flex max-w-full">
      <select id={id} value={value} onChange={onChange} aria-label={label} className={`${CHIP} truncate`}>
        {children}
      </select>
      <ChevronDownIcon className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-ninja-muted" />
    </span>
  );
}

// Searches rather than loading the roster: a center has hundreds of ninjas and
// a task form has no business pulling all of them down to fill one field.
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
      <div className="flex items-center gap-1">
        <span className="font-ninja text-[13px] font-medium text-ninja-navy bg-ninja-bg rounded-md px-2.5 py-1 truncate">
          {name || `Ninja #${value}`}
        </span>
        <IconButton onClick={() => onChange(null, null)} label="Remove ninja">
          <XIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
        </IconButton>
      </div>
    );
  }

  return (
    <div ref={boxRef} className="relative inline-block">
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Link a ninja"
        aria-label="Link a ninja"
        className="font-ninja text-[13px] rounded-md border-0 bg-ninja-bg px-2.5 py-1 text-ninja-navy placeholder:text-ninja-muted w-44"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-30 left-0 right-0 mt-1 rounded-lg border border-ninja-border bg-white shadow-lg overflow-hidden max-h-48 overflow-y-auto">
          {results.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => { onChange(s.id, s.full_name); setQuery(''); setOpen(false); }}
                className="w-full text-left font-ninja text-[13px] px-2.5 py-1.5 text-ninja-navy hover:bg-ninja-bg transition"
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

// Only for Submit invoice. Eight fields that exist for one kind of task is
// exactly why this is a block that appears rather than eight inputs every task
// carries empty.
function InvoiceFields({ draft, set }) {
  const put = (key) => (e) => set({ ...draft, [key]: e.target.value });
  const field = 'font-ninja text-[13px] rounded-md border border-ninja-border bg-white px-2.5 py-1.5 text-ninja-navy placeholder:text-ninja-muted';
  return (
    <div className="rounded-lg bg-ninja-bg p-3 space-y-2">
      <p className="font-ninja text-[11px] font-semibold text-ninja-muted uppercase tracking-wide">Invoice</p>
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

// One property of the record: what it is on the left, its value on the right.
function PropRow({ label, htmlFor, children }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] items-center gap-3 min-h-[2.1rem]">
      <label htmlFor={htmlFor} className="font-ninja text-[13px] text-ninja-muted">{label}</label>
      <div className="min-w-0 flex items-center">{children}</div>
    </div>
  );
}

export default function TaskDialog({
  open, mode, task, preset, assignees, canEditText = true, canDelete = false,
  onClose, onSaved, onDeleted,
}) {
  const initial = mode === 'edit' ? task : null;
  const [title, setTitle] = useState(initial?.title || '');
  const [body, setBody] = useState(initial?.body || '');
  const [category, setCategory] = useState(initial?.category || preset?.category || 'other');
  const [status, setStatus] = useState(initial?.status || preset?.status || 'todo');
  const [due, setDue] = useState(initial?.due_date || '');
  const [assignee, setAssignee] = useState(
    initial?.assignee_id ? String(initial.assignee_id)
      : preset?.assignee_id ? String(preset.assignee_id) : '',
  );
  const [studentId, setStudentId] = useState(initial?.student_id || null);
  const [studentName, setStudentName] = useState(initial?.student_name || null);
  const [invoice, setInvoice] = useState(() => toInvoiceDraft(initial?.invoice));
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [error, setError] = useState(null);

  // A title OR a description, matching what the server will accept.
  const canSave = !canEditText || !!(title.trim() || body.trim());

  const submit = async () => {
    if (!canSave || busy) return;
    setBusy(true);
    setError(null);
    // Only what this director is allowed to write. Sending the text fields from
    // a non-author would bounce off the server's author gate and take the
    // shared fields down with it.
    const payload = canEditText
      ? {
        title,
        body,
        category,
        status,
        due_date: due || null,
        assignee_id: assignee || null,
        student_id: studentId || null,
        invoice: invoicePayload(invoice, category),
      }
      : {
        status,
        due_date: due || null,
        assignee_id: assignee || null,
        student_id: studentId || null,
      };
    try {
      const saved = mode === 'edit'
        ? await api.patch(`/tasks/${task.id}`, payload)
        : await api.post('/tasks', payload);
      onSaved(saved, mode !== 'edit');
      onClose();
    } catch (err) {
      setError(err?.message || 'That did not save. Try again.');
      setBusy(false);
    }
  };

  const destroy = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api.delete(`/tasks/${task.id}`);
      onDeleted(task.id);
      onClose();
    } catch {
      setBusy(false);
      setConfirmDel(false);
      setError('That did not delete. Try again.');
    }
  };

  const ownerName = assignee
    ? assignees.find((a) => String(a.id) === assignee)?.display_name
    : null;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={mode === 'edit' ? 'Task' : 'New task'}
      width="max-w-2xl"
    >
      <div className="space-y-4">
        {canEditText ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            autoFocus
            placeholder="What needs doing?"
            aria-label="Task name"
            // No box. The title IS the heading of this dialog. The inline
            // background outruns the global dark-mode input override, which
            // would otherwise paint a band behind the heading.
            style={{ background: 'transparent' }}
            className="w-full font-ninja text-2xl font-bold tracking-tight text-ninja-navy border-0 p-0 placeholder:text-ninja-muted"
          />
        ) : (
          <h3 className="font-ninja text-2xl font-bold tracking-tight text-ninja-navy">{title || body}</h3>
        )}

        {/* The record's properties, read top to bottom. */}
        <div className="space-y-0.5">
          <PropRow label="Status" htmlFor="task-status">
            <ChipSelect id="task-status" value={status} onChange={(e) => setStatus(e.target.value)} label="Status">
              {LANES.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
            </ChipSelect>
          </PropRow>

          <PropRow label="Kind" htmlFor={canEditText ? 'task-kind' : undefined}>
            {canEditText ? (
              <ChipSelect id="task-kind" value={category} onChange={(e) => setCategory(e.target.value)} label="Kind">
                {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </ChipSelect>
            ) : (
              <KindTag category={category} />
            )}
          </PropRow>

          {/* All optional. Most of what a center is carrying has no deadline,
              no single owner and no one ninja, and a form that insists on them
              gets filled with made-up ones. */}
          <PropRow label="Due date" htmlFor="task-due">
            <input
              id="task-due"
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="font-ninja text-[13px] font-medium rounded-md border-0 bg-ninja-bg px-2.5 py-1 text-ninja-navy w-[9.5rem]"
            />
          </PropRow>

          <PropRow label="Assigned to" htmlFor="task-assignee">
            <div className="flex items-center gap-1.5 min-w-0">
              {assignee && <OwnerBadge id={Number(assignee)} name={ownerName} />}
              <ChipSelect id="task-assignee" value={assignee} onChange={(e) => setAssignee(e.target.value)} label="Assigned to">
                <option value="">Anyone</option>
                {assignees.map((a) => <option key={a.id} value={a.id}>{a.display_name}</option>)}
              </ChipSelect>
            </div>
          </PropRow>

          <PropRow label="Ninja">
            <StudentPicker
              value={studentId}
              name={studentName}
              onChange={(id, name) => { setStudentId(id); setStudentName(name); }}
            />
          </PropRow>

          {mode === 'edit' && (
            <PropRow label="Added by">
              <span className="font-ninja text-[13px] text-ninja-navy">
                {task.created_by_name || 'Unknown'}
                {task.completed_at && (
                  <span className="text-ninja-muted"> · finished {shortDate(task.completed_at)}</span>
                )}
              </span>
            </PropRow>
          )}
        </div>

        {canEditText ? (
          <div className="h-44 flex flex-col min-h-0 rounded-lg bg-ninja-bg px-3 py-2.5">
            <LazyMarkdownEditor
              variant="bare"
              value={body}
              onChange={setBody}
              placeholder="Anything the next director needs to know…"
            />
          </div>
        ) : (
          // Another director's words, readable but not editable: the server
          // keeps a task's text with whoever wrote it.
          <div className="font-ninja text-[13px] text-ninja-navy rounded-lg bg-ninja-bg px-3 py-2.5 min-h-[3rem]">
            {title && body
              ? <ReactMarkdown components={MD} urlTransform={mdUrl}>{body}</ReactMarkdown>
              : <p className="text-ninja-muted">No description.</p>}
          </div>
        )}

        {canEditText && category === 'submit_invoice' && (
          <InvoiceFields draft={invoice} set={setInvoice} />
        )}
        {!canEditText && task?.invoice && (
          <div className="rounded-lg bg-ninja-bg p-3">
            <p className="font-ninja text-[11px] font-semibold text-ninja-muted uppercase tracking-wide">Invoice</p>
            <p className="font-ninja text-[13px] text-ninja-navy mt-1">{invoiceLine(task.invoice) || 'No details yet.'}</p>
          </div>
        )}

        {error && <p className="font-ninja text-[13px] text-ninja-red">{error}</p>}

        <div className="flex items-center gap-2 pt-3 border-t border-ninja-border">
          {/* The confirm keeps its word. Icons are fine for reversible actions;
              a destructive one should never rest on the reader recognising a
              glyph. */}
          {mode === 'edit' && canDelete && (
            confirmDel ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={destroy}
                  disabled={busy}
                  className="font-ninja text-[13px] font-semibold px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-60 transition"
                >
                  Delete
                </button>
                <DiscardButton onClick={() => setConfirmDel(false)} label="Keep task" />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDel(true)}
                className="font-ninja text-[13px] font-medium text-ninja-muted hover:text-ninja-red transition-colors"
              >
                Delete
              </button>
            )
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="font-ninja text-[13px] font-medium px-3 py-1.5 rounded-lg text-ninja-muted hover:text-ninja-navy hover:bg-ninja-bg transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || !canSave}
            className="font-ninja text-[13px] font-semibold px-4 py-1.5 rounded-lg bg-ninja-blue text-white hover:brightness-95 disabled:opacity-50 transition"
          >
            {mode === 'edit' ? 'Save changes' : 'Add task'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
