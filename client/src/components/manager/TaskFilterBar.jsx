import { SearchIcon } from 'lucide-react';
import { EMPTY_FILTERS, isFiltered } from '../../lib/taskFilters';

// Due used to be four chips sitting in a row next to the assignee menu, so the
// bar read as seven things to decide before looking at any work. It is one menu
// now: the four answers are exclusive, which is what a menu is for.
const DUE_OPTIONS = [
  { key: 'any', label: 'Any time' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'week', label: 'Due in 7 days' },
  { key: 'none', label: 'No due date' },
];

const FIELD =
  'bg-white border rounded-lg px-3 py-1.5 font-ninja text-sm text-ninja-navy focus:outline-none transition-colors';

// One bar above both views. Narrowing the board narrows the list, because they
// are the same question asked of the same array.
export default function TaskFilterBar({
  filters, onChange, directors, showArchived, onShowArchived, boardView, centerName, meId,
}) {
  const set = (patch) => onChange({ ...filters, ...patch });
  const active = isFiltered(filters);

  // "Me" already covers whoever is reading, so listing them again by name below
  // it offers the same board twice under two labels.
  const others = directors.filter((d) => String(d.id) !== String(meId));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ninja-muted pointer-events-none" />
        <input
          type="search"
          value={filters.q}
          onChange={(e) => set({ q: e.target.value })}
          placeholder="Search tasks"
          aria-label="Search tasks"
          className={`${FIELD} border-ninja-border focus:border-ninja-blue pl-8 w-48`}
        />
      </div>

      {/* The card carried by the center is named after the center, the way the
          editor names it. "The center" was a phrase nobody had been taught. */}
      <select
        value={filters.assignee}
        onChange={(e) => set({ assignee: e.target.value })}
        aria-label="Show tasks assigned to"
        className={`${FIELD} ${filters.assignee === 'anyone' ? 'border-ninja-border' : 'border-ninja-blue'} focus:border-ninja-blue`}
      >
        <option value="anyone">Anyone</option>
        <option value="mine">Me</option>
        <option value="center">{centerName || 'The whole center'}</option>
        {others.map((d) => (
          <option key={d.id} value={String(d.id)}>{d.display_name}</option>
        ))}
      </select>

      <select
        value={filters.due}
        onChange={(e) => set({ due: e.target.value })}
        aria-label="Show tasks due"
        className={`${FIELD} ${filters.due === 'any' ? 'border-ninja-border' : 'border-ninja-blue'} focus:border-ninja-blue`}
      >
        {DUE_OPTIONS.map((o) => (
          <option key={o.key} value={o.key}>{o.label}</option>
        ))}
      </select>

      {active && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_FILTERS)}
          className="font-ninja text-xs font-semibold text-ninja-muted hover:text-ninja-blue transition-colors"
        >
          Clear
        </button>
      )}

      {/* Archived is a different fetch, not a different filter: those cards are
          not in the board's hands until they are asked for. It sits apart from
          the filters for that reason, and because it is not a daily question. */}
      <button
        type="button"
        aria-pressed={showArchived}
        onClick={() => onShowArchived(!showArchived)}
        className={`ml-auto px-3 py-1.5 rounded-full font-ninja text-xs font-semibold border transition-colors duration-150 ease-[var(--ease-out)] active:scale-95 ${
          showArchived
            ? 'bg-ninja-navy text-white border-ninja-navy dark:bg-white dark:text-ninja-bg'
            : 'bg-transparent text-ninja-muted border-transparent hover:text-ninja-navy hover:border-ninja-border'
        }`}
      >
        {showArchived ? 'Viewing archived' : 'Archived'}
      </button>

      {/* Said once, where the filter is set, rather than leaving somebody to
          discover a board that has quietly stopped responding to a drag. */}
      {active && boardView && (
        <span className="font-ninja text-xs text-ninja-muted basis-full">
          Dragging is off while a filter is on. Use a card's menu to move it.
        </span>
      )}
    </div>
  );
}
