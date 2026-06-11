import { motion } from 'framer-motion';

const OPTIONS = [
  { value: 'light', label: 'Light', emoji: '☀️' },
  { value: 'dark', label: 'Dark', emoji: '🌙' },
];

/**
 * Segmented Light / Dark control. Keyboard: arrow keys move selection.
 * Active pill slides via a shared layoutId.
 */
export default function ModeToggle({ mode, onChange }) {
  const handleKey = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange('dark');
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange('light');
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Appearance mode"
      onKeyDown={handleKey}
      className="relative inline-flex items-center gap-1 rounded-full p-1
                 bg-black/25 border border-white/10 backdrop-blur-md
                 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]"
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
            className="relative flex items-center gap-1.5 rounded-full px-4 py-1.5
                       text-sm font-semibold font-ninja outline-none
                       focus-visible:ring-2 focus-visible:ring-white/40 transition-colors"
          >
            {active && (
              <motion.span
                layoutId="modeTogglePill"
                transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                className="absolute inset-0 rounded-full bg-white/15 border border-white/20
                           shadow-[0_2px_10px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.25)]"
              />
            )}
            <span className="relative z-10 text-base leading-none">{opt.emoji}</span>
            <span className={`relative z-10 ${active ? 'text-white' : 'text-white/55'}`}>
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
