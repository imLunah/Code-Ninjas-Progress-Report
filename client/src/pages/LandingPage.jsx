import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const BELT_COLORS = [
  '#ffffff',
  '#fbbf24',
  '#f97316',
  '#ef4444',
  '#3b82f6',
  '#a855f7',
  '#92400e',
  '#111827',
];

const BG       = '#1c2132';
const BLUE     = 'rgb(56,161,255)';
const TEXT     = '#d0daed';
const MUTED    = '#8a9ab8';
const GLOW     = 'rgba(56,161,255,0.18)';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] } },
};

export default function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate(
        user.role === 'manager' ? '/manager/dashboard' : '/sensei/dashboard',
        { replace: true }
      );
    }
  }, [user, loading, navigate]);

  if (loading || user) {
    return (
      <div style={{ background: BG }} className="min-h-screen flex items-center justify-center">
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: BLUE, borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <div
      style={{ background: BG, color: TEXT }}
      className="min-h-screen flex flex-col font-ninja overflow-hidden relative"
    >
      {/* Belt strip — top */}
      <div className="flex h-1.5 flex-shrink-0 relative z-20">
        {BELT_COLORS.map((c, i) => (
          <div key={i} style={{ background: c, flex: 1 }} />
        ))}
      </div>

      {/* Radial background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% 38%, rgba(56,161,255,0.07) 0%, transparent 70%)',
        }}
      />

      {/* Slowly rotating watermark star */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <motion.img
          src="/CodeNinjasIcon.svg"
          alt=""
          className="w-[700px] h-[700px] select-none"
          style={{ opacity: 0.035 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* Floating belt dots — background decoration */}
      {BELT_COLORS.slice(1).map((c, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            background: c,
            width: 10 + (i % 3) * 5,
            height: 10 + (i % 3) * 5,
            opacity: 0.15,
            left: `${8 + i * 12}%`,
            top: `${15 + (i % 4) * 18}%`,
          }}
          animate={{ y: [0, -14, 0] }}
          transition={{
            duration: 3.5 + i * 0.4,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.3,
          }}
        />
      ))}

      {/* ── Hero ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center relative z-10 py-20">

        {/* Logo */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          <img src="/DojoLinkLogoH.svg" alt="DojoLink" className="h-10 mx-auto" />
        </motion.div>

        {/* Pill badge */}
        <motion.div
          className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold"
          style={{
            background: 'rgba(56,161,255,0.1)',
            color: BLUE,
            border: '1px solid rgba(56,161,255,0.22)',
          }}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.18, duration: 0.45, type: 'spring', stiffness: 260 }}
        >
          <span>⚡</span>
          <span>For Code Ninjas Centers</span>
        </motion.div>

        {/* Staggered headline + subtext + CTA */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center"
        >
          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            className="text-5xl sm:text-6xl md:text-[4.5rem] font-extrabold leading-[1.1] tracking-tight mb-6"
          >
            Your Dojo.
            <br />
            <span
              style={{
                color: BLUE,
                textShadow: `0 0 48px ${GLOW}`,
              }}
            >
              Command it.
            </span>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            variants={fadeUp}
            className="text-lg md:text-xl max-w-md leading-relaxed mb-10"
            style={{ color: MUTED }}
          >
            The studio management tool built for Senseis and Center Directors.
            Log belt progress, track check‑ins, run clubs — all in one place.
          </motion.p>

          {/* CTA button */}
          <motion.button
            variants={fadeUp}
            onClick={() => navigate('/login')}
            className="relative overflow-hidden px-12 py-4 rounded-2xl text-lg font-extrabold tracking-wide text-white group"
            style={{
              background: `linear-gradient(135deg, ${BLUE}, rgb(28,138,255))`,
              boxShadow: `0 0 36px rgba(56,161,255,0.28), 0 4px 16px rgba(0,0,0,0.3)`,
            }}
            whileHover={{ scale: 1.06, boxShadow: '0 0 52px rgba(56,161,255,0.45), 0 6px 24px rgba(0,0,0,0.35)' }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          >
            {/* Shimmer sweep */}
            <span
              className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                transform: 'skewX(-20deg)',
              }}
            />
            <span className="relative z-10 flex items-center gap-3">
              Sign In
              <motion.span
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                className="text-xl"
              >
                →
              </motion.span>
            </span>
          </motion.button>
        </motion.div>
      </div>

      {/* Celebrate ninja — bottom right, desktop only */}
      <motion.img
        src="/CodeNinjasCelebrate.webp"
        alt=""
        className="hidden lg:block absolute bottom-10 right-4 xl:right-16 h-64 xl:h-80 object-contain pointer-events-none select-none"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 0.85, y: 0 }}
        transition={{ delay: 0.9, duration: 0.75, ease: 'easeOut' }}
      />

      {/* Footer */}
      <motion.footer
        className="relative z-20 flex items-center justify-center gap-4 pb-5 pt-2 text-xs"
        style={{ color: MUTED }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.6 }}
      >
        <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
        <span style={{ opacity: 0.35 }}>·</span>
        <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
      </motion.footer>

      {/* Belt strip — bottom */}
      <div className="flex h-1.5 flex-shrink-0 relative z-20">
        {BELT_COLORS.map((c, i) => (
          <div key={i} style={{ background: c, flex: 1 }} />
        ))}
      </div>
    </div>
  );
}
