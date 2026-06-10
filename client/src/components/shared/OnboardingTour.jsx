import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import Markdown from './Markdown';

const SPRING = { type: 'spring', stiffness: 320, damping: 32, mass: 0.9 };

function StepMedia({ item }) {
  if (!item) return null;
  if (item.type === 'video') {
    return <video src={item.url} autoPlay loop muted playsInline className="w-full rounded-2xl bg-black/30 object-contain max-h-[42vh]" />;
  }
  return <img src={item.url} alt="" className="w-full rounded-2xl object-contain max-h-[42vh]" />;
}

// Globally mounted (App.jsx). Auto-plays for brand-new staff after their first reset,
// and replays on demand via the `replay_onboarding` window event (Account button).
export default function OnboardingTour() {
  const { user, setUser } = useAuth();
  const [steps, setSteps] = useState([]);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);       // [index, direction]
  const [dir, setDir] = useState(1);
  const checkedFor = useRef(null);

  const launch = useCallback((rows) => {
    if (Array.isArray(rows) && rows.length) { setSteps(rows); setPage(0); setDir(1); setOpen(true); }
  }, []);

  // Auto-trigger for new users (after forced reset, before they've onboarded).
  useEffect(() => {
    if (!user) { setOpen(false); setSteps([]); checkedFor.current = null; return; }
    if (user.mustResetPassword || user.onboarded) return;
    if (checkedFor.current === user.id) return;
    checkedFor.current = user.id;
    api.get('/onboarding/steps').then(launch).catch(() => {});
  }, [user, launch]);

  // Manual replay (Account → Replay walkthrough).
  useEffect(() => {
    const handler = () => { api.get('/onboarding/steps').then(launch).catch(() => {}); };
    window.addEventListener('replay_onboarding', handler);
    return () => window.removeEventListener('replay_onboarding', handler);
  }, [launch]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const finish = useCallback(() => {
    setOpen(false);
    api.post('/onboarding/complete', {}).catch(() => {});
    if (user && !user.onboarded) setUser({ ...user, onboarded: true });
  }, [user, setUser]);

  const next = () => {
    if (page >= steps.length - 1) { finish(); return; }
    setDir(1); setPage((p) => p + 1);
  };
  const back = () => { if (page > 0) { setDir(-1); setPage((p) => p - 1); } };

  if (!open || !steps.length) return null;
  const step = steps[page];
  const isLast = page === steps.length - 1;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="onboarding-backdrop"
          className="fixed inset-0 z-[130] flex flex-col bg-ninja-bg lg:bg-ninja-navy/60 lg:items-center lg:justify-center lg:p-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <motion.div
            className="w-full flex-1 flex flex-col overflow-hidden lg:flex-none lg:max-h-[88dvh] lg:rounded-3xl lg:bg-ninja-bg lg:shadow-2xl lg:border lg:border-ninja-border max-w-md"
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={SPRING}
          >
            {/* Top bar: progress dots + skip */}
            <div className="flex-shrink-0 flex items-center justify-between px-5 pt-5 pb-2">
              <div className="flex items-center gap-1.5">
                {steps.map((_, i) => (
                  <motion.span
                    key={i}
                    className="h-1.5 rounded-full bg-ninja-blue"
                    animate={{ width: i === page ? 22 : 7, opacity: i === page ? 1 : 0.3 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                ))}
              </div>
              <button onClick={finish} className="text-ninja-muted hover:text-ninja-navy font-ninja text-sm font-semibold transition-colors">
                Skip
              </button>
            </div>

            {/* Animated step content */}
            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-3">
              <AnimatePresence mode="wait" custom={dir}>
                <motion.div
                  key={step.id}
                  custom={dir}
                  initial={{ opacity: 0, x: dir * 48 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: dir * -48 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  {Array.isArray(step.media) && step.media[0] && (
                    <div className="mb-4"><StepMedia item={step.media[0]} /></div>
                  )}
                  <h2 className="text-xl font-black font-ninja text-ninja-navy mb-2">{step.title}</h2>
                  {step.body_md?.trim() && <Markdown>{step.body_md}</Markdown>}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer: back / next */}
            <div className="flex-shrink-0 flex items-center gap-3 px-5 pt-3 pb-[max(env(safe-area-inset-bottom),18px)] lg:pb-5 border-t border-ninja-border">
              {page > 0 ? (
                <motion.button onClick={back} whileTap={{ scale: 0.96 }}
                  className="px-4 py-3 rounded-xl bg-ninja-bg border border-ninja-border text-ninja-navy font-ninja font-semibold text-sm hover:border-ninja-blue transition-colors">
                  Back
                </motion.button>
              ) : <div className="w-px" />}
              <motion.button onClick={next} whileTap={{ scale: 0.97 }}
                className="flex-1 py-3 rounded-xl bg-ninja-blue text-white font-ninja font-semibold text-sm hover:bg-ninja-blue/90 transition-colors">
                {isLast ? 'Get started' : 'Next'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
