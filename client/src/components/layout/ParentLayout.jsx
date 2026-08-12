import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParentAuth } from '../../context/ParentAuthContext';
import ThemeToggle from '../ui/ThemeToggle';
import Logo from '../ui/Logo';
import BugReportButton from '../ui/BugReportButton';
import { RocketIcon } from '../ui/icons';

function BugIcon() {
  return (
    <RocketIcon className="w-4 h-4" />
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
    <div className="min-h-[100dvh] bg-ninja-bg">
      <nav className="bg-white border-b border-ninja-border h-20 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Logo variant="lockup" className="h-9 text-ninja-navy" />
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
