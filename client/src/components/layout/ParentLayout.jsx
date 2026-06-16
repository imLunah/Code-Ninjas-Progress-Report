import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParentAuth } from '../../context/ParentAuthContext';
import ThemeToggle from '../ui/ThemeToggle';
import BugReportButton from '../ui/BugReportButton';

function BugIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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
        title="Report a bug"
        className="fixed bottom-6 right-6 z-40 bg-white border border-ninja-border text-ninja-muted hover:text-ninja-red shadow-lg rounded-full w-9 h-9 flex items-center justify-center transition-all hover:shadow-xl"
      >
        <BugIcon />
      </button>
      <BugReportButton open={bugOpen} onClose={() => setBugOpen(false)} reporter={{ name: parent?.parentName, role: 'parent' }} />
    </div>
  );
}
