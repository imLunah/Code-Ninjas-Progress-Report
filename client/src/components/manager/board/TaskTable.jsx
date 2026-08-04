import { Link } from 'react-router-dom';
import { CheckIcon, PlusIcon } from 'lucide-react';
import { KindTag, OwnerBadge, DueDate, shortDate, invoiceLine } from './boardShared';

// The Operations Tracker as a list: one row per task, grouped under headings,
// read top to bottom. Where a task stands is the grouping on the To-do tab and
// the checkbox on every row.
//
// The whole table lives inside one CARD window (the page composes it); rows
// run edge to edge inside it so the hover wash reaches the frame, which is
// what makes this read as a surface rather than lines floating on the page.

// One template shared by the header row and every task row, so a column can
// never be one width in the header and another in the body. Small screens keep
// only the checkbox and the name; kind, due and owner fold into a second line
// inside the name cell.
const GRID = 'grid items-center gap-x-3 grid-cols-[1rem_minmax(0,1fr)] '
  + 'md:grid-cols-[1rem_minmax(0,1fr)_7.5rem_5.5rem_10rem] '
  + 'xl:grid-cols-[1rem_minmax(0,1fr)_7.5rem_5.5rem_10rem_9rem_4.5rem]';

// Every row starts at the same left edge as the toolbar above it.
const PAD = 'px-4';

const HEAD = 'font-ninja text-[11px] font-medium text-ninja-muted';

// Its own control rather than a native input: the row already has a hover
// state, and a 16px box with a check that appears is the whole vocabulary this
// needs. role/aria carry what the element type no longer does.
function DoneCheck({ task, disabled, onToggle }) {
  const done = task.status === 'done';
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={done ? 'Put this task back' : 'Mark this task done'}
      disabled={disabled}
      onClick={() => onToggle(task)}
      className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors ${
        done
          ? 'bg-ninja-blue border-ninja-blue text-white'
          : 'border-ninja-border hover:border-ninja-blue text-transparent'
      } ${disabled ? 'cursor-default' : ''}`}
    >
      <CheckIcon className="w-2.5 h-2.5" strokeWidth={3.5} />
    </button>
  );
}

function Row({ task, interactive, onOpen, onToggle }) {
  const done = task.status === 'done';
  const claim = task.invoice && task.category === 'submit_invoice' ? invoiceLine(task.invoice) : null;

  return (
    <div
      className={`${GRID} ${PAD} group border-b border-ninja-border/70 py-[7px] md:min-h-[2.5rem] ${
        interactive ? 'cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors' : ''
      }`}
      // The row is a shortcut for the pointer; the Open button inside it is the
      // real control, so the keyboard and screen readers lose nothing.
      onClick={interactive ? (e) => {
        if (e.target.closest('button, a, input, select')) return;
        onOpen(task);
      } : undefined}
    >
      <DoneCheck task={task} disabled={!interactive} onToggle={onToggle} />

      <div className="min-w-0 flex items-center gap-2">
        <div className="min-w-0">
          <p className={`font-ninja text-[13px] font-medium truncate ${
            done ? 'text-ninja-muted line-through decoration-1' : 'text-ninja-navy'
          }`}
          >
            {task.title || task.body}
          </p>
          {claim && <p className="font-ninja text-[11px] text-ninja-muted truncate">{claim}</p>}
          {/* Small screens: the columns, folded under the name. */}
          <div className="md:hidden flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
            <KindTag category={task.category} />
            <DueDate due={task.due_date} status={task.status} />
            {task.assignee_id && (
              <span className="font-ninja text-xs text-ninja-muted truncate">{task.assignee_name}</span>
            )}
          </div>
        </div>

        {interactive && (
          <button
            type="button"
            onClick={() => onOpen(task)}
            className="ml-auto hidden md:inline-flex flex-shrink-0 font-ninja text-[11px] font-semibold px-2 py-[3px] rounded-md border border-ninja-border bg-white text-ninja-navy shadow-sm opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
          >
            Open
          </button>
        )}
      </div>

      <div className="hidden md:block min-w-0"><KindTag category={task.category} /></div>
      <div className="hidden md:block"><DueDate due={task.due_date} status={task.status} /></div>
      <div className="hidden md:flex items-center gap-1.5 min-w-0">
        <OwnerBadge id={task.assignee_id} name={task.assignee_name} />
        {task.assignee_id && (
          <span className="font-ninja text-xs text-ninja-navy truncate">{task.assignee_name}</span>
        )}
      </div>

      <div className="hidden xl:block min-w-0">
        {task.student_id && (
          <Link
            to={`/manager/students/${task.student_id}`}
            className="font-ninja text-xs font-medium text-ninja-blue hover:underline underline-offset-2 truncate block"
          >
            {task.student_name || 'Ninja'}
          </Link>
        )}
      </div>
      <div className="hidden xl:block font-ninja text-xs text-ninja-muted">
        {done && task.completed_at ? shortDate(task.completed_at) : shortDate(task.created_at)}
      </div>
    </div>
  );
}

function Group({ group, first, isReadOnly, onOpen, onToggle, onAdd }) {
  return (
    <section aria-label={group.label || 'Tasks'}>
      {group.label && (
        <div className={`${PAD} flex items-baseline gap-2 pb-1.5 ${first ? 'pt-3' : 'pt-6'}`}>
          <h3 className="font-ninja text-[13px] font-semibold text-ninja-navy">{group.label}</h3>
          <span className="font-ninja text-[11px] text-ninja-muted tabular-nums">{group.tasks.length}</span>
        </div>
      )}
      <div className={group.label ? 'border-t border-ninja-border/70' : ''}>
        {group.tasks.map((task) => (
          <Row
            key={task.id}
            task={task}
            interactive={!isReadOnly}
            onOpen={onOpen}
            onToggle={onToggle}
          />
        ))}
        {group.tasks.length === 0 && (
          <p className={`${PAD} font-ninja text-xs text-ninja-muted py-3 border-b border-ninja-border/70`}>
            Nothing here.
          </p>
        )}
        {!isReadOnly && group.preset && (
          <button
            type="button"
            onClick={() => onAdd(group.preset)}
            className={`${PAD} w-full flex items-center gap-1.5 font-ninja text-[13px] font-medium text-ninja-muted hover:text-ninja-navy py-2 transition-colors`}
          >
            <PlusIcon className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2.25} />
            New
          </button>
        )}
      </div>
    </section>
  );
}

export default function TaskTable({ groups, isReadOnly, onOpen, onToggle, onAdd }) {
  return (
    <div className="pb-2">
      {/* The column names, once, above everything. Small screens drop them
          along with the columns. */}
      <div className={`${GRID} ${PAD} hidden md:grid py-2 border-b border-ninja-border`}>
        <span aria-hidden="true" />
        <span className={HEAD}>Name</span>
        <span className={HEAD}>Kind</span>
        <span className={HEAD}>Due</span>
        <span className={HEAD}>Owner</span>
        <span className={`${HEAD} hidden xl:block`}>Ninja</span>
        <span className={`${HEAD} hidden xl:block`}>Date</span>
      </div>

      {groups.map((group, i) => (
        <Group
          key={group.key}
          group={group}
          first={i === 0}
          isReadOnly={isReadOnly}
          onOpen={onOpen}
          onToggle={onToggle}
          onAdd={onAdd}
        />
      ))}
    </div>
  );
}
