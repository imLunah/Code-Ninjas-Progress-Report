import { motion } from 'framer-motion';
import { ACCENTS, DEFAULT_OPTION } from '../../lib/accents';

// Default first, then the accent colors.
const OPTIONS = [DEFAULT_OPTION, ...ACCENTS];

/**
 * Row of circular swatches: a "Default" (restore stock theme) chip followed by
 * the accent colors. Selected swatch scales up with an animated ring. Keyboard:
 * arrows move, Enter/Space select. Scrolls horizontally on narrow viewports.
 */
export default function ColorPalette({ value, onChange }) {
  const current = value || 'default';

  const handleKey = (e, idx) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(OPTIONS[(idx + 1) % OPTIONS.length].id);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(OPTIONS[(idx - 1 + OPTIONS.length) % OPTIONS.length].id);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Accent color"
      className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1 px-0.5"
    >
      {OPTIONS.map((a, idx) => {
        const active = current === a.id;
        const isDefault = a.id === 'default';
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
                       focus-visible:ring-2 focus-visible:ring-ninja-blue/50 focus-visible:ring-offset-2
                       focus-visible:ring-offset-white"
          >
            {active && (
              <motion.span
                layoutId="accentRing"
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                className="absolute -inset-1.5 rounded-full border-2 border-ninja-navy"
              />
            )}
            <motion.span
              whileHover={{ scale: 1.14 }}
              whileTap={{ scale: 0.92 }}
              animate={{ scale: active ? 1.1 : 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 24 }}
              className="flex items-center justify-center w-8 h-8 rounded-full ring-1 ring-black/10"
              style={{ backgroundColor: a.swatch }}
            >
              {isDefault && (
                // a "reset / none" glyph so Default reads as classic, not a color
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M3 12a9 9 0 1 0 3-6.7" /><polyline points="3 4 3 9 8 9" />
                </svg>
              )}
            </motion.span>
          </button>
        );
      })}
    </div>
  );
}
