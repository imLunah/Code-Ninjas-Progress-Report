import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import ThemeToggle from '../ui/ThemeToggle';
import BugReportButton from '../ui/BugReportButton';
import { useAuth } from '../../context/AuthContext';

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
          className="bg-amber-400 px-4 sm:px-6 py-3 flex items-center gap-3"
        >
          <svg className="w-5 h-5 text-amber-900 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0112 8zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <p className="flex-1 text-amber-900 font-ninja font-bold text-sm leading-snug">{text}</p>
          <button
            onClick={dismiss}
            className="text-amber-800 hover:text-amber-900 transition-colors flex-shrink-0"
            aria-label="Dismiss announcement"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
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
