import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useParentAuth } from '../../context/ParentAuthContext';
import { api } from '../../api/client';
import ReleaseContent from './ReleaseContent';
import { ONBOARDING_ENABLED } from '../../lib/features';

const PANEL_SPRING = { type: 'spring', stiffness: 320, damping: 30, mass: 0.9 };

// Globally mounted (App.jsx). On login, fetches releases the user hasn't seen and
// pops a "What's New" modal. Closing marks everything published-so-far as seen.
export default function WhatsNewModal() {
  const { user } = useAuth();
  const parentAuth = useParentAuth();
  const parent = parentAuth?.parent;
  const [releases, setReleases] = useState([]);
  const [open, setOpen] = useState(false);
  const checkedFor = useRef(null);

  useEffect(() => {
    // Staff-only feature — never fetch the staff releases endpoint in a parent session.
    if (parent) { setOpen(false); setReleases([]); checkedFor.current = null; return; }
    if (!user) { setOpen(false); setReleases([]); checkedFor.current = null; return; }
    // Force-reset + onboarding take priority; don't stack the What's New modal on top.
    if (user.mustResetPassword || (ONBOARDING_ENABLED && user.onboarded === false)) return;
    if (checkedFor.current === user.id) return;
    checkedFor.current = user.id;
    api.get('/releases/unseen')
      .then((rows) => {
        if (Array.isArray(rows) && rows.length) { setReleases(rows); setOpen(true); }
      })
      .catch(() => {});
  }, [user, parent]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const dismiss = () => {
    setOpen(false);
    api.post('/releases/seen', {}).catch(() => {});
  };

  if (!releases.length) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="whatsnew-backdrop"
          className="fixed inset-0 z-[120] flex flex-col bg-ninja-bg lg:bg-ninja-navy/50 lg:items-center lg:justify-center lg:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <motion.div
            className="w-full flex-1 flex flex-col overflow-hidden lg:flex-none lg:max-h-[90dvh] lg:rounded-2xl lg:bg-ninja-bg lg:shadow-2xl lg:border lg:border-ninja-border max-w-lg"
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={PANEL_SPRING}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-shrink-0 flex items-center justify-between px-5 pt-5 pb-3 lg:border-b lg:border-ninja-border">
              <div>
                <motion.p
                  className="text-ninja-blue font-ninja text-xs font-bold uppercase tracking-wide flex items-center gap-1.5"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.12, duration: 0.3 }}
                >
                  <motion.span
                    initial={{ rotate: -25, scale: 0 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ delay: 0.18, type: 'spring', stiffness: 400, damping: 14 }}
                    className="inline-block"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 6.3L21 9.2l-5 4.3 1.6 6.5L12 16.8 6.4 20l1.6-6.5-5-4.3 6.6-.9z" /></svg>
                  </motion.span>
                  What's New
                </motion.p>
                <h2 className="text-xl font-bold font-ninja text-ninja-navy">
                  {releases.length > 1 ? `${releases.length} updates` : 'Latest update'}
                </h2>
              </div>
              <motion.button
                onClick={dismiss}
                whileTap={{ scale: 0.85 }}
                className="hidden lg:block text-ninja-muted hover:text-ninja-navy transition-colors text-2xl leading-none"
                aria-label="Close"
              >
                &times;
              </motion.button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-6">
              {releases.map((r, i) => (
                <motion.div
                  key={r.id}
                  className={i > 0 ? 'pt-6 border-t border-ninja-border' : ''}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + Math.min(i, 6) * 0.08, ...PANEL_SPRING }}
                >
                  <ReleaseContent release={r} />
                </motion.div>
              ))}
            </div>

            <div className="flex-shrink-0 px-5 pt-3 pb-[max(env(safe-area-inset-bottom),16px)] lg:pb-4 border-t border-ninja-border">
              <motion.button
                onClick={dismiss}
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22, duration: 0.3 }}
                className="w-full py-3 rounded-xl bg-ninja-blue text-white font-ninja font-semibold text-sm hover:bg-ninja-blue/90 transition-colors"
              >
                Got it
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
