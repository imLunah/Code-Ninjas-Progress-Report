import { useState } from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import ThemeToggle from '../ui/ThemeToggle';
import BugReportButton from '../ui/BugReportButton';
import { useAuth } from '../../context/AuthContext';

function AnnouncementBanner({ text }) {
  const storageKey = `ann_dismissed_${btoa(text).slice(0, 16)}`;
  const [dismissed, setDismissed] = useState(() => !!sessionStorage.getItem(storageKey));

  if (dismissed) return null;

  const dismiss = () => {
    sessionStorage.setItem(storageKey, '1');
    setDismissed(true);
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-start gap-3">
      <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="flex-1 text-amber-800 font-ninja text-sm leading-snug">{text}</p>
      <button onClick={dismiss} className="text-amber-500 hover:text-amber-700 transition-colors flex-shrink-0 mt-0.5">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
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
