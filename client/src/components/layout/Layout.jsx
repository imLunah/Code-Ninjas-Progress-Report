import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import ThemeToggle from '../ui/ThemeToggle';
import BugReportButton from '../ui/BugReportButton';
import { useAuth } from '../../context/AuthContext';

function AnnouncementBanner({ text }) {
  const storageKey = `ann_dismissed_${btoa(text).slice(0, 16)}`;
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
          <div className="w-1 h-4 rounded-full bg-ninja-blue flex-shrink-0" />
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
  const { user } = useAuth();
  return (
    <div className="min-h-[100dvh] bg-ninja-bg lg:flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 relative">
        {user?.announcement && <AnnouncementBanner text={user.announcement} />}
        {/* Mobile theme toggle — fixed top-right, hidden on desktop (sidebar has it) */}
        <div className="lg:hidden fixed top-3 right-4 z-30">
          <ThemeToggle />
        </div>
        <main className="max-w-7xl lg:max-w-none mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-32 lg:pb-8">
          {children}
        </main>
      </div>
      <MobileNav />
      <BugReportButton reporter={{ name: user?.displayName, role: user?.role, location: user?.activeLocation?.name }} />
    </div>
  );
}
