import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, logout, switchLocation } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <nav className="bg-white border-b border-ninja-border sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link to="/">
              <img src="/CodeNinjasLogoH.svg" alt="Code Ninjas" className="h-8" />
            </Link>
            <span className="text-ninja-muted text-sm font-ninja hidden sm:block">| Dojo Tracker</span>
          </div>

          {/* Location switcher */}
          {user && (
            <div className="flex items-center">
              {user.role === 'manager' ? (
                <select
                  value={user.activeLocation?.id ?? ''}
                  onChange={(e) => switchLocation(Number(e.target.value))}
                  className="bg-white border border-ninja-border text-ninja-navy rounded-lg px-3 py-1.5 font-ninja text-sm font-semibold focus:outline-none focus:border-ninja-blue transition-colors"
                >
                  {user.availableLocations?.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              ) : (
                <span className="text-ninja-muted text-sm font-ninja px-3 py-1.5 bg-ninja-bg border border-ninja-border rounded-lg">
                  {user.activeLocation?.name ?? ''}
                </span>
              )}
            </div>
          )}

          {/* Navigation Links */}
          {user && (
            <div className="flex items-center gap-6">
              {user.role === 'manager' && (
                <>
                  <Link
                    to="/manager/dashboard"
                    className="text-ninja-muted hover:text-ninja-blue font-ninja font-semibold text-sm tracking-wide transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/manager/students"
                    className="text-ninja-muted hover:text-ninja-blue font-ninja font-semibold text-sm tracking-wide transition-colors"
                  >
                    Students
                  </Link>
                </>
              )}
              {user.role === 'sensei' && (
                <>
                  <Link
                    to="/sensei/dashboard"
                    className="text-ninja-muted hover:text-ninja-blue font-ninja font-semibold text-sm tracking-wide transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/manager/students"
                    className="text-ninja-muted hover:text-ninja-blue font-ninja font-semibold text-sm tracking-wide transition-colors"
                  >
                    Students
                  </Link>
                </>
              )}
            </div>
          )}

          {/* User info + logout */}
          {user && (
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-ninja-navy text-sm font-ninja font-semibold">{user.displayName}</p>
                <p className="text-ninja-muted text-xs font-ninja capitalize">{user.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="border border-ninja-blue text-ninja-blue hover:bg-ninja-blue hover:text-white text-sm font-ninja font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
