import { motion } from 'framer-motion';
import { ACCENTS } from '../../lib/accents';

/**
 * Horizontal row of circular accent swatches. Selected swatch scales up with
 * an animated ring (shared layoutId). Keyboard: arrows move, Enter/Space select.
 * Scrolls horizontally on narrow viewports.
 */
export default function ColorPalette({ value, onChange }) {
  const handleKey = (e, idx) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(ACCENTS[(idx + 1) % ACCENTS.length].id);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(ACCENTS[(idx - 1 + ACCENTS.length) % ACCENTS.length].id);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Accent color"
      className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1 px-0.5"
    >
      {ACCENTS.map((a, idx) => {
        const active = value === a.id;
        return (
          <button
            key={a.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={a.label}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(a.id)}
            onKeyDown={(e) => handleKey(e, idx)}
            className="relative flex-shrink-0 outline-none rounded-full
                       focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2
                       focus-visible:ring-offset-transparent"
          >
            {active && (
              <motion.span
                layoutId="accentRing"
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                className="absolute -inset-1.5 rounded-full border-2 border-white/80"
              />
            )}
            <motion.span
              whileHover={{ scale: 1.14 }}
              whileTap={{ scale: 0.92 }}
              animate={{ scale: active ? 1.12 : 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 24 }}
              className="block w-8 h-8 rounded-full"
              style={{
                backgroundColor: a.swatch,
                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.45), inset 0 -2px 4px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.3)',
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
