import { motion } from 'framer-motion';
import { SWATCH_GRID, DEFAULT_OPTION } from '../../lib/accents';

const eq = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

// Default first, then the full grid of hues/shades.
const CELLS = [DEFAULT_OPTION.id, ...SWATCH_GRID];

/**
 * In-panel color palette. A grid of swatches (Default + a spread of hues and
 * shades) the user taps directly — no native OS picker. Selected cell gets an
 * animated ring. Keyboard: arrows move, Enter/Space select.
 */
export default function ColorPalette({ value, onChange }) {
  const current = value || 'default';

  const handleKey = (e, idx) => {
    let next = idx;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % CELLS.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (idx - 1 + CELLS.length) % CELLS.length;
    else return;
    e.preventDefault();
    onChange(CELLS[next]);
  };

  return (
    <div
      role="radiogroup"
      aria-label="Accent color"
      className="flex flex-wrap items-center justify-center gap-3"
    >
      {CELLS.map((cell, idx) => {
        const isDefault = cell === 'default';
        const active = isDefault ? current === 'default' : eq(current, cell);
        return (
          <button
            key={cell}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={isDefault ? 'Default' : cell}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(cell)}
            onKeyDown={(e) => handleKey(e, idx)}
            className="relative outline-none rounded-full
                       focus-visible:ring-2 focus-visible:ring-ninja-blue/50 focus-visible:ring-offset-2
                       focus-visible:ring-offset-white"
          >
            {active && (
              <motion.span
                layoutId="accentRing"
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                className="absolute -inset-1 rounded-full border-2 border-ninja-navy"
              />
            )}
            <motion.span
              whileHover={{ scale: 1.18 }}
              whileTap={{ scale: 0.9 }}
              animate={{ scale: active ? 1.08 : 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 24 }}
              className="flex items-center justify-center w-7 h-7 rounded-full ring-1 ring-black/10"
              style={{ backgroundColor: isDefault ? DEFAULT_OPTION.swatch : cell }}
            >
              {isDefault && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round">
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
