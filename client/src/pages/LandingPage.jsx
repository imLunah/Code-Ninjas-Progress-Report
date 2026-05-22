import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const BG    = '#1c2132';
const BLUE  = 'rgb(56,161,255)';
const TEXT  = '#d0daed';
const MUTED = '#8a9ab8';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 26 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] },
});

export default function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate(
        user.role === 'manager' ? '/manager/dashboard' : '/sensei/dashboard',
        { replace: true }
      );
    }
  }, [user, loading, navigate]);

  const handleSignIn = () => setLeaving(true);

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
    <motion.div
      style={{ background: BG, color: TEXT }}
      className="min-h-screen flex flex-col font-ninja overflow-hidden relative"
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      onAnimationComplete={() => { if (leaving) navigate('/login', { state: { fromLanding: true } }); }}
    >
      {/* Background image */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'url(/ninja_background.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.04,
        }}
      />

      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 65% 50% at 50% 42%, rgba(56,161,255,0.07) 0%, transparent 70%)',
        }}
      />

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center relative z-10 py-8">

        {/* Logo */}
        <motion.div className="mb-5" {...fadeUp(0)}>
          <img
            src="/DojoLinkLogoH.svg"
            alt="DojoLink"
            className="h-16 sm:h-20 md:h-28 mx-auto"
            style={{ filter: 'drop-shadow(0 0 32px rgba(56,161,255,0.35))' }}
          />
        </motion.div>

        {/* Tagline */}
        <motion.h1
          className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.12] tracking-tight mb-4"
          {...fadeUp(0.15)}
        >
          Dojo management{' '}
          <span style={{ color: BLUE, textShadow: '0 0 40px rgba(56,161,255,0.35)' }}>
            for staff and parents.
          </span>
        </motion.h1>

        {/* Subtext */}
        <motion.p
          className="text-base md:text-lg max-w-sm leading-relaxed mb-7"
          style={{ color: MUTED }}
          {...fadeUp(0.28)}
        >
          Check ins, belt progress, clubs and parent updates all in one place.
        </motion.p>

        {/* CTA */}
        <motion.button
          onClick={handleSignIn}
          className="px-10 py-4 rounded-2xl text-base font-extrabold tracking-wide text-white relative overflow-hidden group"
          style={{
            background: `linear-gradient(135deg, rgb(56,161,255), rgb(22,128,240))`,
            boxShadow: '0 0 32px rgba(56,161,255,0.25), 0 4px 14px rgba(0,0,0,0.3)',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ scale: 1.05, boxShadow: '0 0 48px rgba(56,161,255,0.4), 0 6px 20px rgba(0,0,0,0.35)' }}
          whileTap={{ scale: 0.97 }}
        >
          <span
            className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)', transform: 'skewX(-20deg)' }}
          />
          <span className="relative z-10 flex items-center gap-2.5">
            Get Started
            <motion.span
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              →
            </motion.span>
          </span>
        </motion.button>
      </div>

      {/* Waving ninja — desktop only */}
      <motion.img
        src="/ninja_waving.png"
        alt=""
        className="hidden lg:block absolute right-[10%] xl:right-[14%] top-1/2 -translate-y-1/2 h-80 xl:h-96 object-contain pointer-events-none select-none"
        initial={{ x: '120%' }}
        animate={{ x: 0 }}
        transition={{ delay: 0.5, type: 'spring', damping: 28, stiffness: 180 }}
      />

      {/* Footer */}
      <motion.footer
        className="relative z-20 flex items-center justify-center gap-4 pb-5 text-xs"
        style={{ color: MUTED }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.85, duration: 0.6 }}
      >
        <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
        <span style={{ opacity: 0.3 }}>·</span>
        <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
      </motion.footer>
    </motion.div>
  );
}
