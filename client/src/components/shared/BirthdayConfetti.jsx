import { useRef } from 'react';
import { motion } from 'framer-motion';

const COLORS = ['#38a1ff','#f59e0b','#22c55e','#ef4444','#8b5cf6','#ec4899','#14b8a6'];
const COUNT = 48;

export function isBirthdayToday(birthday) {
  if (!birthday) return false;
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
  return String(birthday).split('T')[0].slice(5) === today.slice(5);
}

export default function BirthdayConfetti() {
  const pieces = useRef(
    Array.from({ length: COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: 6 + Math.random() * 8,
      color: COLORS[i % COLORS.length],
      delay: Math.random() * 1.2,
      duration: 2.2 + Math.random() * 1.4,
      rotate: Math.random() * 360,
      drift: (Math.random() - 0.5) * 60,
      round: Math.random() > 0.5,
    }))
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-[9998] overflow-hidden">
      {pieces.current.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `calc(${p.x}vw + 0px)`, opacity: 1, rotate: p.rotate }}
          animate={{ y: '110vh', x: `calc(${p.x}vw + ${p.drift}px)`, opacity: 0, rotate: p.rotate + 360 }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
          style={{
            position: 'absolute',
            top: 0,
            width: p.size,
            height: p.size,
            borderRadius: p.round ? '50%' : 2,
            backgroundColor: p.color,
          }}
        />
      ))}
    </div>
  );
}
