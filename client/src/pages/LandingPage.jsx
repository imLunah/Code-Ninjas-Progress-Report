import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth, hadSession } from '../context/AuthContext';
import { getHomePath } from '../lib/navTabs';
import { useLightOnly } from '../context/ThemeContext';
import Logo from '../components/ui/Logo';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y:  0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const FEATURES = ['Front desk check-in', 'Belt and lesson progress', 'A portal for parents'];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);
  // Only someone who has signed in before is worth holding a spinner for. A first-time
  // visitor gets the hero on the first frame instead of waiting out /auth/me.
  const [maybeSignedIn] = useState(hadSession);
  // The public face of the product is light, full stop — a staff member's dark
  // preference waits for them past the sign-in door.
  useLightOnly();

  useEffect(() => {
    if (!loading && user) {
      navigate(getHomePath(user), { replace: true });
    }
  }, [user, loading, navigate]);

  const handleSignIn = () => setLeaving(true);

  if ((loading && maybeSignedIn) || user) {
    return (
      <div className="theme-locked min-h-[100dvh] bg-ninja-bg flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-ninja-blue border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      className="theme-locked min-h-[100dvh] bg-ninja-bg text-ninja-navy font-ninja flex flex-col relative overflow-hidden"
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      onAnimationComplete={() => { if (leaving) navigate('/login', { state: { fromLanding: true } }); }}
    >
      {/* Soft brand glow, drawn from the token so it holds in both themes */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 50% at 28% 38%, rgb(var(--ninja-blue) / 0.07) 0%, transparent 70%), ' +
            'radial-gradient(ellipse 45% 45% at 82% 72%, rgb(var(--ninja-blue) / 0.06) 0%, transparent 72%)',
        }}
      />

      {/* Watermark: the mark itself, barely there, anchoring the bottom corner */}
      <div className="absolute -left-24 -bottom-28 pointer-events-none opacity-[0.04]" aria-hidden="true">
        <Logo variant="mark" className="h-[440px] text-ninja-navy" accent="currentColor" title="" />
      </div>

      {/* Top bar */}
      <motion.header
        className="relative z-10 flex items-center justify-between px-6 sm:px-10 lg:px-14 pt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Logo variant="lockup" className="h-8 sm:h-9 text-ninja-navy" />
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={handleSignIn}
            className="font-ninja font-bold text-sm text-ninja-muted hover:text-ninja-blue transition-colors"
          >
            Sign in
          </button>
        </div>
      </motion.header>

      {/* Hero */}
      <div className="flex-1 flex items-center relative z-10 px-6 sm:px-10 lg:px-14 py-10">
        <div className="w-full max-w-6xl mx-auto grid lg:grid-cols-[1fr_auto] items-center gap-10 lg:gap-16">
          <motion.div
            className="text-center lg:text-left max-w-[560px] mx-auto lg:mx-0"
            variants={stagger}
            initial="hidden"
            animate="show"
          >
            <motion.h1
              variants={fadeUp}
              className="font-black tracking-tight mb-5 sm:mb-6"
              style={{ fontSize: 'clamp(34px, 6.5vw, 62px)', lineHeight: 1.08 }}
            >
              Dojo management for{' '}
              <span className="text-ninja-blue">staff and parents.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-ninja-muted text-base sm:text-lg leading-relaxed mb-8 sm:mb-10 max-w-md mx-auto lg:mx-0"
            >
              The front desk, belt progress, and what parents see at home, all in one place.
            </motion.p>

            <motion.div variants={fadeUp} className="flex justify-center lg:justify-start mb-8 sm:mb-10">
              <motion.button
                onClick={handleSignIn}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="relative overflow-hidden group bg-ninja-blue text-white font-ninja font-bold text-lg px-12 py-4 rounded-2xl w-full sm:w-auto"
                style={{ boxShadow: '0 6px 32px rgb(var(--ninja-blue) / 0.28)' }}
              >
                <span
                  className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)', transform: 'skewX(-20deg)' }}
                />
                <span className="relative flex items-center justify-center gap-2.5">
                  Get Started
                  <motion.span
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    →
                  </motion.span>
                </span>
              </motion.button>
            </motion.div>

            <motion.ul
              variants={fadeUp}
              className="flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2"
            >
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm font-semibold text-ninja-muted">
                  <svg className="w-4 h-4 text-ninja-blue flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </motion.ul>
          </motion.div>

          {/* Mascot */}
          <div className="hidden lg:block relative">
            <div
              className="absolute inset-0 scale-125 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse 60% 55% at 50% 55%, rgb(var(--ninja-blue) / 0.14) 0%, transparent 70%)' }}
            />
            <motion.img
              src="/CodeNinjasCelebrate.webp"
              alt=""
              width="581"
              height="694"
              className="relative object-contain select-none"
              style={{
                height: 'min(58vh, 460px)',
                width: 'auto',
                filter: 'drop-shadow(0 24px 40px rgb(var(--ninja-navy) / 0.28))',
              }}
              initial={{ x: 80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <motion.footer
        className="relative z-10 flex items-center justify-center lg:justify-start flex-wrap gap-3 pb-6 px-6 sm:px-10 lg:px-14 text-xs text-ninja-muted"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.6 }}
      >
        <Link to="/privacy" className="hover:text-ninja-blue transition-colors">Privacy Policy</Link>
        <span className="opacity-40">·</span>
        <Link to="/terms" className="hover:text-ninja-blue transition-colors">Terms</Link>
        <span className="opacity-40">·</span>
        <Link to="/accessibility" className="hover:text-ninja-blue transition-colors">Accessibility</Link>
      </motion.footer>
    </motion.div>
  );
}
