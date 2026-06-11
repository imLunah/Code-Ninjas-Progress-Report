import { useRef } from 'react';
import { motion } from 'framer-motion';
import { ACCENTS, DEFAULT_OPTION, isCustomAccent } from '../../lib/accents';

// Default first, then the preset accent colors. Custom picker is rendered last.
const OPTIONS = [DEFAULT_OPTION, ...ACCENTS];

/**
 * Row of circular swatches: a "Default" chip, the preset accents, and a
 * "Custom" swatch that opens the native color picker for any hue/shade.
 * Selected swatch scales up with an animated ring. Keyboard: arrows move,
 * Enter/Space select. Scrolls horizontally on narrow viewports.
 */
export default function ColorPalette({ value, onChange }) {
  const current = value || 'default';
  const custom = isCustomAccent(current);
  const colorInput = useRef(null);

  const count = OPTIONS.length + 1; // + custom
  const handleKey = (e, idx) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = OPTIONS[(idx + 1) % count];
      if (next) onChange(next.id); else colorInput.current?.click();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIdx = (idx - 1 + count) % count;
      const prev = OPTIONS[prevIdx];
      if (prev) onChange(prev.id); else colorInput.current?.click();
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
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M3 12a9 9 0 1 0 3-6.7" /><polyline points="3 4 3 9 8 9" />
                </svg>
              )}
            </motion.span>
          </button>
        );
      })}

      {/* Custom — opens native color picker */}
      <button
        type="button"
        role="radio"
        aria-checked={custom}
        aria-label="Custom color"
        tabIndex={custom ? 0 : -1}
        onClick={() => colorInput.current?.click()}
        onKeyDown={(e) => handleKey(e, OPTIONS.length)}
        className="relative flex-shrink-0 outline-none rounded-full
                   focus-visible:ring-2 focus-visible:ring-ninja-blue/50 focus-visible:ring-offset-2
                   focus-visible:ring-offset-white"
      >
        {custom && (
          <motion.span
            layoutId="accentRing"
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className="absolute -inset-1.5 rounded-full border-2 border-ninja-navy"
          />
        )}
        <motion.span
          whileHover={{ scale: 1.14 }}
          whileTap={{ scale: 0.92 }}
          animate={{ scale: custom ? 1.1 : 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 24 }}
          className="flex items-center justify-center w-8 h-8 rounded-full ring-1 ring-black/10"
          style={{
            background: custom
              ? current
              : 'conic-gradient(from 0deg, #ef4444, #f97316, #eab308, #22c55e, #3b82f6, #a855f7, #ec4899, #ef4444)',
          }}
        >
          {!custom && (
            <span className="w-3 h-3 rounded-full bg-white/85 flex items-center justify-center">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="3.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </span>
          )}
        </motion.span>
        <input
          ref={colorInput}
          type="color"
          value={custom ? current : '#3b82f6'}
          onChange={(e) => onChange(e.target.value)}
          aria-hidden="true"
          tabIndex={-1}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </button>
    </div>
  );
}
