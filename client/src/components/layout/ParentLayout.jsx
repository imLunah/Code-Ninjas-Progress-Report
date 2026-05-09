import { useNavigate } from 'react-router-dom';
import { useParentAuth } from '../../context/ParentAuthContext';

export default function ParentLayout({ children }) {
  const { parent, logout } = useParentAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/parent/login');
  };

  return (
    <div className="min-h-screen bg-ninja-bg">
      <nav className="bg-white border-b border-ninja-border h-16 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <img src="/DojoLinkLogoH.svg" alt="DojoLink" className="h-8" />
          <span className="text-ninja-muted font-ninja text-sm hidden sm:inline">Parent Portal</span>
        </div>
        <div className="flex items-center gap-3">
          {parent?.parentName && (
            <span className="text-ninja-muted font-ninja text-sm hidden sm:inline">
              {parent.parentName}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="text-ninja-muted hover:text-ninja-red font-ninja text-sm transition-colors"
          >
            Sign Out
          </button>
        </div>
      </nav>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
