import { motion } from 'framer-motion';

// Each card doubles as a status filter for the board. Clicking the active card
// again resets to the default 'unlogged' view (no card highlighted).
const CARDS = [
  { key: 'logged',  label: 'Logged today', filter: 'logged',  color: '#22c55e' },
  { key: 'pending', label: 'Pending',      filter: 'pending', color: '#eab308' },
  { key: 'overdue', label: 'Overdue',      filter: 'overdue', color: '#ef4444' },
  { key: 'total',   label: 'Total today',  filter: 'all',     color: 'rgb(var(--ninja-blue))' },
];

/**
 * The four dashboard stat cards — also the board's status filter. `counts` is
 * keyed by logged/pending/overdue/total; `active` is the current statusFilter;
 * `onSelect(filter)` sets it (pass 'unlogged' to clear).
 */
export default function BoardStats({ counts, active, onSelect }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS.map((c, i) => {
        const isActive = active === c.filter;
        return (
          <motion.button
            key={c.key}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelect(isActive ? 'unlogged' : c.filter)}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3, ease: 'easeOut' }}
            className={`text-left bg-white rounded-xl p-4 shadow-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ninja-blue/40 ${
              isActive ? 'border-2 border-ninja-blue' : 'border border-ninja-border hover:border-ninja-blue/40'
            }`}
          >
            <p className="font-ninja font-bold text-xs text-ninja-muted uppercase tracking-wide">{c.label}</p>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="font-ninja font-black text-3xl text-ninja-navy leading-none">{counts[c.key]}</span>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
