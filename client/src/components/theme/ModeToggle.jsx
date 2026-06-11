import { motion } from 'framer-motion';

const OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/**
 * Segmented Light / Dark control. Themed with ninja tokens so it adapts to the
 * active palette. Keyboard: arrow keys move selection; active pill slides.
 */
export default function ModeToggle({ mode, onChange }) {
  const handleKey = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); onChange('dark'); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); onChange('light'); }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Appearance mode"
      onKeyDown={handleKey}
      className="relative grid grid-cols-2 gap-1 p-1 rounded-2xl bg-ninja-bg border border-ninja-border"
    >
      {OPTIONS.map((opt) => {
        const active = mode === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(opt.value)}
            className="relative flex items-center justify-center rounded-xl px-4 py-2
                       text-sm font-bold font-ninja outline-none
                       focus-visible:ring-2 focus-visible:ring-ninja-blue/40"
          >
            {active && (
              <motion.span
                layoutId="modeTogglePill"
                transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                className="absolute inset-0 rounded-xl bg-white border border-ninja-border shadow-sm"
              />
            )}
            <span className={`relative z-10 ${active ? 'text-ninja-navy' : 'text-ninja-muted'}`}>
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
