import { SearchIcon } from 'lucide-react';
import { EMPTY_FILTERS, isFiltered } from '../../lib/taskFilters';

const DUE_CHIPS = [
  { key: 'any', label: 'Any time' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'week', label: 'Next 7 days' },
  { key: 'none', label: 'No date' },
];

const FIELD =
  'bg-white border border-ninja-border rounded-lg px-3 py-1.5 font-ninja text-sm text-ninja-navy focus:outline-none focus:border-ninja-blue transition-colors';

// One bar above both views. Narrowing the board narrows the list, because they
// are the same question asked of the same array.
export default function TaskFilterBar({ filters, onChange, directors, showArchived, onShowArchived, boardView }) {
  const set = (patch) => onChange({ ...filters, ...patch });
  const active = isFiltered(filters);

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
          className={`${FIELD} pl-8 w-44`}
        />
      </div>

      <select
        value={filters.assignee}
        onChange={(e) => set({ assignee: e.target.value })}
        aria-label="Filter by who has it"
        className={FIELD}
      >
        <option value="anyone">Anyone</option>
        <option value="mine">Mine</option>
        <option value="center">The center</option>
        {directors.map((d) => (
          <option key={d.id} value={String(d.id)}>{d.display_name}</option>
        ))}
      </select>

      <div className="flex flex-wrap items-center gap-1.5">
        {DUE_CHIPS.map((c) => {
          const on = filters.due === c.key;
          return (
            <button
              key={c.key}
              type="button"
              aria-pressed={on}
              onClick={() => set({ due: c.key })}
              className={`px-3 py-1.5 rounded-full font-ninja text-xs font-semibold border transition-colors duration-150 ease-[var(--ease-out)] active:scale-95 ${
                on
                  ? 'bg-ninja-blue text-white border-ninja-blue'
                  : 'bg-white text-ninja-navy border-ninja-border hover:border-ninja-blue'
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Archived is a different fetch, not a different filter: those cards are
          not in the board's hands until they are asked for. */}
      <button
        type="button"
        aria-pressed={showArchived}
        onClick={() => onShowArchived(!showArchived)}
        className={`px-3 py-1.5 rounded-full font-ninja text-xs font-semibold border transition-colors duration-150 ease-[var(--ease-out)] active:scale-95 ${
          showArchived
            ? 'bg-ninja-navy text-white border-ninja-navy dark:bg-white dark:text-ninja-bg'
            : 'bg-white text-ninja-navy border-ninja-border hover:border-ninja-blue'
        }`}
      >
        {showArchived ? 'Viewing archived' : 'Archived'}
      </button>

      {active && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_FILTERS)}
          className="font-ninja text-xs font-semibold text-ninja-muted hover:text-ninja-blue transition-colors"
        >
          Clear
        </button>
      )}

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
