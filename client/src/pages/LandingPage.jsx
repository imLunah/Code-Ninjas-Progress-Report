import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const BG    = '#1c2132';
const BLUE  = 'rgb(56,161,255)';
const TEXT  = '#d0daed';
const MUTED = '#8a9ab8';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
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
        ['manager', 'admin'].includes(user.role) ? '/manager/dashboard' : '/sensei/dashboard',
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
      className="min-h-screen flex flex-col font-ninja relative"
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      onAnimationComplete={() => { if (leaving) navigate('/login', { state: { fromLanding: true } }); }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 55% at 36% 46%, rgba(56,161,255,0.10) 0%, transparent 70%), ' +
            'radial-gradient(ellipse 45% 40% at 88% 78%, rgba(56,161,255,0.08) 0%, transparent 72%)',
        }}
      />

      {/* Main content */}
      <div className="flex-1 flex items-center relative z-10 px-8 sm:px-12 lg:px-[84px]">
        <div className="w-full max-w-[540px] mx-auto lg:mx-0 text-center lg:text-left">

          {/* Wordmark */}
          <motion.div className="mb-5 sm:mb-6" {...fadeUp(0)}>
            <span
              className="font-black leading-none"
              style={{ fontSize: 'clamp(48px, 12vw, 88px)', letterSpacing: '-0.01em' }}
            >
              <span style={{ color: BLUE }}>DOJO</span>
              <span style={{ color: '#ffffff' }}>LINK</span>
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            className="font-extrabold leading-[1.18] tracking-tight mb-7 sm:mb-9"
            style={{ fontSize: 'clamp(24px, 6vw, 50px)', color: TEXT }}
            {...fadeUp(0.15)}
          >
            Dojo management<br />
            for{' '}
            <span style={{ color: BLUE }}>staff and parents.</span>
          </motion.h1>

          {/* CTA */}
          <motion.div
            className="flex justify-center lg:justify-start"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.button
              onClick={handleSignIn}
              className="relative overflow-hidden group font-ninja font-extrabold text-white w-full sm:w-auto"
              style={{
                padding: '16px 48px',
                borderRadius: '16px',
                fontSize: '18px',
                letterSpacing: '0.01em',
                background: 'linear-gradient(160deg, rgb(82,178,255) 0%, rgb(40,148,255) 100%)',
                boxShadow:
                  '0 0 40px rgba(56,161,255,0.32), 0 6px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.25)',
                border: 'none',
                cursor: 'pointer',
              }}
              whileHover={{ scale: 1.04, boxShadow: '0 0 56px rgba(56,161,255,0.45), 0 8px 24px rgba(0,0,0,0.35)' }}
              whileTap={{ scale: 0.97 }}
            >
              <span
                className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)', transform: 'skewX(-20deg)' }}
              />
              <span className="relative z-10 flex items-center justify-center gap-3">
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
        </div>
      </div>

      {/* Ninja clip container — overflow-hidden traps horizontal slide-in, inset-0 prevents vertical clipping */}
      <div className="hidden lg:block absolute inset-0 overflow-hidden pointer-events-none">
        <motion.img
          src="/CodeNinjasCelebrate.webp"
          alt=""
          className="absolute object-contain select-none"
          style={{
            right: '4%',
            top: '50%',
            height: 'min(70vh, 540px)',
            filter: 'drop-shadow(0 30px 50px rgba(0,0,0,0.55))',
          }}
          initial={{ x: 600, opacity: 0, y: '-50%' }}
          animate={{ x: 0, opacity: 1, y: '-50%' }}
          transition={{ delay: 0.5, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      {/* Footer */}
      <motion.footer
        className="relative z-20 flex items-center justify-center lg:justify-start flex-wrap gap-3 pb-6 px-8 sm:px-12 lg:px-[84px] text-xs"
        style={{ color: MUTED }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.75, duration: 0.6 }}
      >
        <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
        <span style={{ opacity: 0.3 }}>·</span>
        <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
        <span style={{ opacity: 0.3 }}>·</span>
        <Link to="/accessibility" className="hover:text-white transition-colors">Accessibility</Link>
      </motion.footer>
    </motion.div>
  );
}
