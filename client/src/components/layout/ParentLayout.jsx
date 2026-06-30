import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParentAuth } from '../../context/ParentAuthContext';
import ThemeToggle from '../ui/ThemeToggle';
import BugReportButton from '../ui/BugReportButton';

function BugIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
    </svg>
  );
}

export default function ParentLayout({ children, wide = false }) {
  const { parent, logout } = useParentAuth();
  const navigate = useNavigate();
  const [bugOpen, setBugOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login?tab=parent');
  };

  return (
    <div className="min-h-screen bg-ninja-bg">
      <nav className="bg-white border-b border-ninja-border h-20 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <img src="/DojoLinkLogoH.png" alt="DojoLink" className="h-14" />
          <span className="text-ninja-muted font-ninja text-sm hidden sm:inline">Parent Portal</span>
        </div>
        <div className="flex items-center gap-3">
          {parent?.parentName && (
            <span className="text-ninja-muted font-ninja text-sm hidden sm:inline">
              {parent.parentName}
            </span>
          )}
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="text-ninja-muted hover:text-ninja-red font-ninja text-sm transition-colors"
          >
            Sign Out
          </button>
        </div>
      </nav>
      <main className={`${wide ? 'max-w-3xl lg:max-w-6xl' : 'max-w-3xl'} mx-auto px-4 sm:px-6 py-6`}>
        {children}
      </main>
      <button
        onClick={() => setBugOpen(true)}
        title="Report a bug or suggest a feature"
        className="fixed bottom-6 right-6 z-40 bg-white border border-ninja-border text-ninja-muted hover:text-ninja-red shadow-lg rounded-full w-9 h-9 flex items-center justify-center transition-all hover:shadow-xl"
      >
        <BugIcon />
      </button>
      <BugReportButton open={bugOpen} onClose={() => setBugOpen(false)} reporter={{ name: parent?.parentName, role: 'parent' }} />
    </div>
  );
}
