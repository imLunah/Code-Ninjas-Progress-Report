import { Link } from 'react-router-dom';
import { CheckIcon, PlusIcon } from 'lucide-react';
import { KindTag, OwnerBadge, DueDate, shortDate, invoiceLine } from './boardShared';

// The Operations Tracker as a list: one row per task, grouped under headings,
// read top to bottom. It replaced a three-column kanban board. Columns spend
// the whole screen saying where work stands; a center's operations list mostly
// needs to say what is late, what is next and whose it is, which one line per
// task says better. Where a task stands is still here — it is the grouping on
// the To-do tab and the checkbox on every row.

// One template shared by the header row and every task row, so a column can
// never be one width in the header and another in the body. Small screens keep
// only the checkbox and the name; kind, due and owner fold into a second line
// inside the name cell.
const GRID = 'grid items-center gap-x-3 grid-cols-[1.125rem_minmax(0,1fr)] '
  + 'md:grid-cols-[1.125rem_minmax(0,1fr)_7.5rem_5.5rem_10rem] '
  + 'xl:grid-cols-[1.125rem_minmax(0,1fr)_7.5rem_5.5rem_10rem_9rem_4.5rem]';

const CELL = 'font-ninja text-xs text-ninja-muted';

// Its own control rather than a native input: the row already has a hover
// state, and an 18px box with a check that appears is the whole vocabulary
// this needs. role/aria carry what the element type no longer does.
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
      className={`w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center transition-colors ${
        done
          ? 'bg-ninja-blue border-ninja-blue text-white'
          : 'border-ninja-border hover:border-ninja-blue text-transparent'
      } ${disabled ? 'cursor-default' : ''}`}
    >
      <CheckIcon className="w-3 h-3" strokeWidth={3.5} />
    </button>
  );
}

function Row({ task, interactive, onOpen, onToggle }) {
  const done = task.status === 'done';
  const claim = task.invoice && task.category === 'submit_invoice' ? invoiceLine(task.invoice) : null;

  return (
    <div
      className={`${GRID} group border-b border-ninja-border px-1 py-2 md:min-h-[2.6rem] ${
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
          <p className={`font-ninja text-sm font-semibold truncate ${
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
            className="ml-auto hidden md:inline-flex flex-shrink-0 font-ninja text-xs font-bold px-2.5 py-1 rounded-md border border-ninja-border bg-white text-ninja-navy shadow-sm opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
          >
            Open
          </button>
        )}
      </div>

      <div className="hidden md:block min-w-0"><KindTag category={task.category} /></div>
      <div className="hidden md:block"><DueDate due={task.due_date} status={task.status} /></div>
      <div className="hidden md:flex items-center gap-1.5 min-w-0">
        <OwnerBadge id={task.assignee_id} name={task.assignee_name} />
        <span className={`font-ninja text-xs truncate ${task.assignee_id ? 'text-ninja-navy' : 'text-ninja-muted'}`}>
          {task.assignee_id ? task.assignee_name : ''}
        </span>
      </div>

      <div className="hidden xl:block min-w-0">
        {task.student_id && (
          <Link
            to={`/manager/students/${task.student_id}`}
            className="font-ninja text-xs font-semibold text-ninja-blue hover:underline underline-offset-2 truncate block"
          >
            {task.student_name || 'Ninja'}
          </Link>
        )}
      </div>
      <div className={`hidden xl:block ${CELL}`}>
        {done && task.completed_at ? shortDate(task.completed_at) : shortDate(task.created_at)}
      </div>
    </div>
  );
}

function Group({ group, first, isReadOnly, onOpen, onToggle, onAdd }) {
  return (
    <section aria-label={group.label || 'Tasks'}>
      {group.label && (
        <div className={`flex items-baseline gap-2 px-1 pb-1.5 ${first ? 'pt-3' : 'pt-7'}`}>
          <h3 className="font-ninja text-sm font-bold text-ninja-navy">{group.label}</h3>
          <span className="font-ninja text-xs text-ninja-muted tabular-nums">{group.tasks.length}</span>
        </div>
      )}
      <div className={group.label ? 'border-t border-ninja-border' : ''}>
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
          <p className="font-ninja text-xs text-ninja-muted px-1 py-3 border-b border-ninja-border">
            Nothing here.
          </p>
        )}
        {!isReadOnly && group.preset && (
          <button
            type="button"
            onClick={() => onAdd(group.preset)}
            className="w-full flex items-center gap-1.5 font-ninja text-sm font-semibold text-ninja-muted hover:text-ninja-navy px-1 py-2 transition-colors"
          >
            <PlusIcon className="w-4 h-4 flex-shrink-0" strokeWidth={2.5} />
            New
          </button>
        )}
      </div>
    </section>
  );
}

export default function TaskTable({ groups, isReadOnly, onOpen, onToggle, onAdd }) {
  return (
    <div>
      {/* The column names, once, above everything. Small screens drop them
          along with the columns. */}
      <div className={`${GRID} hidden md:grid px-1 pb-2 border-b border-ninja-border`}>
        <span aria-hidden="true" />
        <span className={CELL}>Name</span>
        <span className={CELL}>Kind</span>
        <span className={CELL}>Due</span>
        <span className={CELL}>Owner</span>
        <span className={`${CELL} hidden xl:block`}>Ninja</span>
        <span className={`${CELL} hidden xl:block`}>Date</span>
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
