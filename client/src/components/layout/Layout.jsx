import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import ThemeToggle from '../ui/ThemeToggle';
import BugReportButton from '../ui/BugReportButton';
import { useAuth } from '../../context/AuthContext';
import { getMobileNavTabs } from '../../lib/navTabs';

const SKIP_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON']);

function touchTargetShouldScroll(el) {
  let node = el;
  while (node && node !== document.body) {
    if (SKIP_TAGS.has(node.tagName)) return true;
    const style = window.getComputedStyle(node);
    const ox = style.overflowX;
    if ((ox === 'auto' || ox === 'scroll') && node.scrollWidth > node.clientWidth) return true;
    node = node.parentElement;
  }
  return false;
}

function AnnouncementBanner({ text }) {
  const storageKey = `ann_dismissed_${encodeURIComponent(text).slice(0, 32)}`;
  const [dismissed, setDismissed] = useState(() => !!sessionStorage.getItem(storageKey));

  const dismiss = () => {
    sessionStorage.setItem(storageKey, '1');
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="border-b border-ninja-border px-4 sm:px-6 py-2.5 flex items-center gap-3"
        >
          <svg className="w-4 h-4 text-ninja-red flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="flex-1 text-ninja-navy font-ninja text-sm leading-snug">{text}</p>
          <button
            onClick={dismiss}
            className="text-ninja-muted hover:text-ninja-navy transition-colors flex-shrink-0"
            aria-label="Dismiss announcement"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Layout({ children }) {
  const { user, viewAs } = useAuth();
  const [bugOpen, setBugOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const dragRef = useRef(null);
  const touchStart = useRef(null);
  const isHorizontalSwipe = useRef(false);
  const swipeDirRef = useRef(null);
  const animating = useRef(false);
  const swipeBlocked = useRef(false);

  useEffect(() => {
    if (user?.mustResetPassword && location.pathname !== '/account') {
      navigate('/account', { replace: true });
    }
  }, [user?.mustResetPassword, location.pathname, navigate]);

  useEffect(() => {
    const handleStart = (e) => {
      if (animating.current) return;
      if (touchTargetShouldScroll(e.target)) return;
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      isHorizontalSwipe.current = false;
      swipeDirRef.current = null;
      swipeBlocked.current = false;
    };

    const handleMove = (e) => {
      if (!touchStart.current || !dragRef.current || animating.current) return;
      const dx = e.touches[0].clientX - touchStart.current.x;
      const dy = e.touches[0].clientY - touchStart.current.y;

      if (!isHorizontalSwipe.current) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (Math.abs(dy) >= Math.abs(dx)) {
          touchStart.current = null;
          return;
        }
        e.preventDefault();
        isHorizontalSwipe.current = true;
        swipeDirRef.current = dx < 0 ? 'left' : 'right';

        const tabs = getMobileNavTabs(user, viewAs);
        const idx = tabs.findIndex(t => t.to === location.pathname);
        if (idx === -1 && dx < 0) { swipeBlocked.current = true; return; }
        if (idx !== -1) {
          const adjIdx = dx < 0 ? idx + 1 : idx - 1;
          if (adjIdx < 0 || adjIdx >= tabs.length) { swipeBlocked.current = true; return; }
        }
      }

      if (swipeBlocked.current) return;

      e.preventDefault();
      dragRef.current.style.transform = `translate3d(${dx}px, 0, 0)`;
      dragRef.current.style.transition = 'none';
    };

    const handleEnd = (e) => {
      if (!touchStart.current || animating.current) return;
      const dx = e.changedTouches[0].clientX - touchStart.current.x;
      const dy = e.changedTouches[0].clientY - touchStart.current.y;
      touchStart.current = null;
      isHorizontalSwipe.current = false;
      const dir = swipeDirRef.current;
      swipeDirRef.current = null;

      const el = dragRef.current;
      if (!el) return;

      if (swipeBlocked.current) { swipeBlocked.current = false; return; }

      const SPRING = 'transform 0.28s cubic-bezier(0.25, 1, 0.5, 1)';

      if (Math.abs(dx) >= 60 && Math.abs(dx) >= Math.abs(dy) * 1.5) {
        const tabs = getMobileNavTabs(user, viewAs);
        const idx = tabs.findIndex(t => t.to === location.pathname);
        if (idx === -1 && dx > 0) {
          animating.current = true;
          el.style.transition = SPRING;
          el.style.transform = 'translate3d(100%, 0, 0)';
          setTimeout(() => {
            el.style.transform = '';
            el.style.transition = '';
            animating.current = false;
            navigate(-1);
          }, 280);
          return;
        }
        if (idx !== -1) {
          const canGoNext = dx < 0 && idx < tabs.length - 1;
          const canGoPrev = dx > 0 && idx > 0;
          if (canGoNext || canGoPrev) {
            animating.current = true;
            const nextPath = canGoNext ? tabs[idx + 1].to : tabs[idx - 1].to;
            el.style.transition = SPRING;
            el.style.transform = `translate3d(${dx < 0 ? '-100%' : '100%'}, 0, 0)`;
            setTimeout(() => {
              el.style.transform = '';
              el.style.transition = '';
              animating.current = false;
              navigate(nextPath, { state: { swipeDir: dir, fromSwipe: true } });
            }, 280);
            return;
          }
        }
      }

      const SNAP = 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)';
      el.style.transition = SNAP;
      el.style.transform = 'translate3d(0, 0, 0)';
    };

    const handleCancel = () => { touchStart.current = null; };

    document.addEventListener('touchstart', handleStart, { passive: true });
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd, { passive: true });
    document.addEventListener('touchcancel', handleCancel, { passive: true });
    return () => {
      document.removeEventListener('touchstart', handleStart);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
      document.removeEventListener('touchcancel', handleCancel);
    };
  }, [user, viewAs, location.pathname, navigate]);

  const fromSwipe = location.state?.fromSwipe;
  const swipeDir = location.state?.swipeDir;
  const enterX = fromSwipe ? 0 : (swipeDir === 'left' ? '100%' : swipeDir === 'right' ? '-100%' : 0);

  return (
    <div className="fixed inset-0 overflow-hidden flex flex-col bg-ninja-bg lg:static lg:inset-auto lg:overflow-visible lg:min-h-[100dvh] lg:flex-row">
      <Sidebar onOpenBug={() => setBugOpen(true)} />
      <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
        {user?.announcement && <AnnouncementBanner text={user.announcement} />}
        <div className="lg:hidden fixed top-3 right-4 z-30">
          <ThemeToggle />
        </div>
        <main className="flex-1 overflow-y-auto min-h-0 max-w-7xl lg:max-w-none mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-4 lg:pb-8">
          <div
            ref={dragRef}
            className="overflow-x-hidden lg:overflow-x-visible touch-pan-y lg:touch-auto"
          >
            <AnimatePresence mode="popLayout">
              <motion.div
                key={location.key}
                initial={{ x: enterX, opacity: fromSwipe ? 1 : 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={fromSwipe ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                style={{ width: '100%' }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

      </div>
      <MobileNav />
      <BugReportButton
        open={bugOpen}
        onClose={() => setBugOpen(false)}
        reporter={{ name: user?.displayName, role: user?.role, location: user?.activeLocation?.name }}
      />
    </div>
  );
}
