import { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

// A fixed organic waveform rendered as an SVG path; the filled portion is
// clipped to the current value so the track reads like a sound wave.
const WAVE = 'M0,16 C12,4 20,28 32,16 C44,4 52,28 64,16 C76,4 84,28 96,16 C108,4 116,28 128,16 C140,4 148,28 160,16 C172,4 180,28 192,16 C204,4 212,28 224,16 C236,4 244,28 256,16';

/**
 * Custom gradient-intensity slider. Drag the glass thumb or use arrow keys.
 * value/onChange are 0..1.
 */
export default function IntensitySlider({ value, onChange }) {
  const trackRef = useRef(null);

  const setFromClientX = useCallback((clientX) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = (clientX - rect.left) / rect.width;
    onChange(Math.min(1, Math.max(0, pct)));
  }, [onChange]);

  const handlePointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setFromClientX(e.clientX);
  };
  const handlePointerMove = (e) => {
    if (e.buttons === 0) return;
    setFromClientX(e.clientX);
  };

  const handleKey = (e) => {
    const step = e.shiftKey ? 0.1 : 0.02;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); onChange(Math.min(1, value + step)); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); onChange(Math.max(0, value - step)); }
    else if (e.key === 'Home') { e.preventDefault(); onChange(0); }
    else if (e.key === 'End') { e.preventDefault(); onChange(1); }
  };

  const pct = Math.round(value * 100);

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold font-ninja uppercase tracking-wide text-ninja-muted">
          Intensity
        </span>
        <span className="text-xs font-bold font-ninja text-ninja-navy tabular-nums">{pct}%</span>
      </div>

      <div
        ref={trackRef}
        role="slider"
        aria-label="Gradient intensity"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onKeyDown={handleKey}
        className="relative h-9 cursor-pointer touch-none outline-none rounded-2xl px-1
                   focus-visible:ring-2 focus-visible:ring-ninja-blue/40"
      >
        <svg viewBox="0 0 256 32" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible">
          <defs>
            <clipPath id="intensityFill"><rect x="0" y="0" width={256 * value} height="32" /></clipPath>
          </defs>
          {/* base waveform */}
          <path d={WAVE} fill="none" stroke="rgb(var(--ninja-border))" strokeWidth="2.5" strokeLinecap="round" />
          {/* filled waveform */}
          <path d={WAVE} fill="none" stroke="rgb(var(--ninja-blue))" strokeWidth="3" strokeLinecap="round" clipPath="url(#intensityFill)" />
        </svg>

        {/* thumb */}
        <motion.div
          className="absolute top-1/2 w-6 h-6 rounded-full pointer-events-none"
          style={{ x: '-50%', y: '-50%' }}
          animate={{ left: `${value * 100}%` }}
          transition={{ type: 'spring', stiffness: 600, damping: 38 }}
        >
          <div className="w-full h-full rounded-full bg-white border-2 border-ninja-blue shadow-md" />
        </motion.div>
      </div>
    </div>
  );
}
