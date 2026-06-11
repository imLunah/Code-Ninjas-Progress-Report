import { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

const SWEEP = 270;          // degrees of travel
const START = -135;         // angle at value 0 (straight down = -135..+135)
const DOTS = 28;

/**
 * Circular rotary knob controlling glow strength (0..1). Drag around the knob
 * or use arrow keys. A dotted ring fills up to the current value.
 */
export default function GlowKnob({ value, onChange }) {
  const ref = useRef(null);

  const setFromPointer = useCallback((clientX, clientY) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    // angle measured from straight-down, clockwise positive
    let deg = (Math.atan2(clientX - cx, cy - clientY) * 180) / Math.PI;
    let pct = (deg - START) / SWEEP;
    pct = Math.min(1, Math.max(0, pct));
    onChange(pct);
  }, [onChange]);

  const handlePointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setFromPointer(e.clientX, e.clientY);
  };
  const handlePointerMove = (e) => {
    if (e.buttons === 0) return;
    setFromPointer(e.clientX, e.clientY);
  };

  const handleKey = (e) => {
    const step = e.shiftKey ? 0.1 : 0.02;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); onChange(Math.min(1, value + step)); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); onChange(Math.max(0, value - step)); }
    else if (e.key === 'Home') { e.preventDefault(); onChange(0); }
    else if (e.key === 'End') { e.preventDefault(); onChange(1); }
  };

  const angle = START + value * SWEEP;
  const pct = Math.round(value * 100);
  const litDots = Math.round(value * DOTS);

  return (
    <div className="flex flex-col items-center select-none">
      <span className="text-xs font-bold font-ninja uppercase tracking-wide text-ninja-muted mb-3 self-start">
        Glow
      </span>

      <div
        ref={ref}
        role="slider"
        aria-label="Glow amount"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onKeyDown={handleKey}
        className="relative w-24 h-24 cursor-grab active:cursor-grabbing touch-none outline-none rounded-full
                   focus-visible:ring-2 focus-visible:ring-ninja-blue/40"
      >
        {/* dotted indicator ring */}
        {Array.from({ length: DOTS }).map((_, i) => {
          const a = (START + (i / (DOTS - 1)) * SWEEP) * (Math.PI / 180);
          const r = 44;
          const x = 48 + Math.sin(a) * r;
          const y = 48 - Math.cos(a) * r;
          const lit = i < litDots;
          return (
            <span
              key={i}
              className="absolute rounded-full"
              style={{
                left: x, top: y, width: 4, height: 4, transform: 'translate(-50%,-50%)',
                backgroundColor: lit ? 'rgb(var(--ninja-blue))' : 'rgb(var(--ninja-border))',
                transition: 'background-color 0.15s',
              }}
            />
          );
        })}

        {/* knob body */}
        <div className="absolute inset-3 rounded-full bg-ninja-bg border border-ninja-border
                        shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)] flex items-center justify-center">
          {/* pointer indicator */}
          <motion.div
            className="absolute w-full h-full"
            animate={{ rotate: angle }}
            transition={{ type: 'spring', stiffness: 500, damping: 36 }}
          >
            <span
              className="absolute left-1/2 top-1.5 w-1.5 h-3.5 rounded-full -translate-x-1/2"
              style={{ backgroundColor: 'rgb(var(--ninja-blue))' }}
            />
          </motion.div>
          <span className="text-sm font-bold font-ninja text-ninja-navy tabular-nums">{pct}</span>
        </div>
      </div>
    </div>
  );
}
