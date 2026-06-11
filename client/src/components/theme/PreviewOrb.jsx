import { useRef, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useMotionTemplate } from 'framer-motion';

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/**
 * Interactive theme preview. A draggable orb/spotlight positions a radial
 * gradient over a dotted grid. `intensity` controls gradient reach, `glow`
 * the orb's halo. Spring physics on the orb; keyboard arrows nudge it.
 * Position is held in motion values (percent) for 60fps drag.
 */
export default function PreviewOrb({ accentSwatch, intensity, glow }) {
  const ref = useRef(null);
  const mvX = useMotionValue(50);
  const mvY = useMotionValue(38);
  const spring = { stiffness: 260, damping: 26, mass: 0.6 };
  const x = useSpring(mvX, spring);
  const y = useSpring(mvY, spring);

  const left = useMotionTemplate`${x}%`;
  const top = useMotionTemplate`${y}%`;

  // gradient spread shrinks/grows with intensity
  const reach = 35 + intensity * 45;
  const bg = useMotionTemplate`radial-gradient(circle at ${x}% ${y}%, rgb(var(--ninja-blue) / ${0.25 + intensity * 0.6}) 0%, rgb(var(--ninja-blue) / ${intensity * 0.25}) ${reach * 0.5}%, transparent ${reach}%)`;

  const halo = useMotionTemplate`0 0 ${20 + glow * 60}px ${glow * 14}px rgb(var(--ninja-blue) / ${0.3 + glow * 0.6})`;

  const setFromPointer = useCallback((clientX, clientY) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    mvX.set(clamp(((clientX - rect.left) / rect.width) * 100, 8, 92));
    mvY.set(clamp(((clientY - rect.top) / rect.height) * 100, 8, 92));
  }, [mvX, mvY]);

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setFromPointer(e.clientX, e.clientY);
  };
  const onPointerMove = (e) => {
    if (e.buttons === 0) return;
    setFromPointer(e.clientX, e.clientY);
  };

  const onKey = (e) => {
    const step = e.shiftKey ? 8 : 3;
    if (e.key === 'ArrowRight') { e.preventDefault(); mvX.set(clamp(mvX.get() + step, 8, 92)); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); mvX.set(clamp(mvX.get() - step, 8, 92)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); mvY.set(clamp(mvY.get() - step, 8, 92)); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); mvY.set(clamp(mvY.get() + step, 8, 92)); }
  };

  return (
    <div
      ref={ref}
      role="slider"
      aria-label="Gradient position. Use arrow keys to move the spotlight."
      aria-valuetext="Drag to reposition the theme gradient"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onKeyDown={onKey}
      className="relative w-full aspect-square rounded-[26px] overflow-hidden cursor-grab active:cursor-grabbing
                 touch-none outline-none border border-white/10
                 bg-[#0b1f17] shadow-[inset_0_1px_2px_rgba(255,255,255,0.06),inset_0_-20px_40px_rgba(0,0,0,0.5)]
                 focus-visible:ring-2 focus-visible:ring-white/40"
    >
      {/* dotted grid */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.22) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      />
      {/* accent gradient spotlight */}
      <motion.div className="absolute inset-0" style={{ background: bg }} />

      {/* orb */}
      <motion.div
        className="absolute w-12 h-12 rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2"
        style={{ left, top, boxShadow: halo }}
      >
        <div
          className="w-full h-full rounded-full border border-white/50"
          style={{
            background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.95), ${accentSwatch} 70%)`,
            boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.6), inset 0 -3px 6px rgba(0,0,0,0.3)',
          }}
        />
      </motion.div>
    </div>
  );
}
