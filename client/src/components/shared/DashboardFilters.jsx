import { motion } from 'framer-motion';

const STATUS = [
  { value: 'pending', label: 'Pending' },
  { value: 'logged', label: 'Logged' },
  { value: 'all', label: 'All' },
];

/**
 * Filter bar for the dashboards: a Pending / Logged / All status segment plus
 * program chips (All + whatever programs are on the board today). Controlled.
 */
export default function DashboardFilters({ status, onStatus, program, onProgram, programs }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {/* status segment */}
      <div role="radiogroup" aria-label="Show" className="inline-flex items-center gap-1 p-1 rounded-xl bg-ninja-bg border border-ninja-border">
        {STATUS.map((s) => {
          const active = status === s.value;
          return (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onStatus(s.value)}
              className="relative px-3 py-1 rounded-lg text-xs font-bold font-ninja outline-none focus-visible:ring-2 focus-visible:ring-ninja-blue/40"
            >
              {active && (
                <motion.span
                  layoutId="dashStatusPill"
                  transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                  className="absolute inset-0 rounded-lg bg-white border border-ninja-border shadow-sm"
                />
              )}
              <span className={`relative z-10 ${active ? 'text-ninja-navy' : 'text-ninja-muted'}`}>{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* program chips — only when there's more than one program today */}
      {programs.length > 1 && (
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
      )}
    </div>
  );
}
