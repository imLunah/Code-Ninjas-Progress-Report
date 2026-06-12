/**
 * Program filter chips (All + whatever programs are on the board today).
 * Status filtering is driven by the BoardStats cards. Renders nothing when
 * there's only one program. Controlled.
 */
export default function DashboardFilters({ program, onProgram, programs }) {
  if (programs.length <= 1) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {[null, ...programs].map((p) => {
        const active = program === p;
        return (
          <button
            key={p ?? 'all'}
            type="button"
            onClick={() => onProgram(p)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold font-ninja border transition-colors ${
              active
                ? 'bg-ninja-blue text-white border-ninja-blue'
                : 'bg-white text-ninja-muted border-ninja-border hover:text-ninja-navy'
            }`}
          >
            {p ?? 'All programs'}
          </button>
        );
      })}
    </div>
  );
}
