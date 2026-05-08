import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, logout, switchLocation } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const closeMenu = () => setMenuOpen(false);

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

          {/* Desktop: Location switcher */}
          {user && (
            <div className="hidden lg:flex items-center">
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

          {/* Desktop: Navigation links */}
          {user && (
            <div className="hidden lg:flex items-center gap-6">
              {user.role === 'manager' && (
                <>
                  <Link to="/manager/dashboard" className="text-ninja-muted hover:text-ninja-blue font-ninja font-semibold text-sm tracking-wide transition-colors">Dashboard</Link>
                  <Link to="/manager/students" className="text-ninja-muted hover:text-ninja-blue font-ninja font-semibold text-sm tracking-wide transition-colors">Ninjas</Link>
                  <Link to="/manager/staff" className="text-ninja-muted hover:text-ninja-blue font-ninja font-semibold text-sm tracking-wide transition-colors">Senseis</Link>
                </>
              )}
              {user.role === 'sensei' && (
                <>
                  <Link to="/sensei/dashboard" className="text-ninja-muted hover:text-ninja-blue font-ninja font-semibold text-sm tracking-wide transition-colors">Dashboard</Link>
                  <Link to="/manager/students" className="text-ninja-muted hover:text-ninja-blue font-ninja font-semibold text-sm tracking-wide transition-colors">Ninjas</Link>
                  <Link to="/manager/staff" className="text-ninja-muted hover:text-ninja-blue font-ninja font-semibold text-sm tracking-wide transition-colors">Senseis</Link>
                </>
              )}
            </div>
          )}

          {/* Desktop: User info + logout */}
          {user && (
            <div className="hidden lg:flex items-center gap-4">
              <div className="text-right">
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

          {/* Mobile: hamburger */}
          {user && (
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-2 text-ninja-navy rounded-lg hover:bg-ninja-bg transition-colors"
              aria-label="Toggle menu"
            >
              {menuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {user && menuOpen && (
        <div className="lg:hidden border-t border-ninja-border bg-white">
          <div className="px-4 py-4 space-y-4">
            {/* User info */}
            <div className="pb-2 border-b border-ninja-border">
              <p className="text-ninja-navy text-sm font-ninja font-semibold">{user.displayName}</p>
              <p className="text-ninja-muted text-xs font-ninja capitalize">{user.role}</p>
            </div>

            {/* Location */}
            {user.role === 'manager' ? (
              <select
                value={user.activeLocation?.id ?? ''}
                onChange={(e) => { switchLocation(Number(e.target.value)); closeMenu(); }}
                className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm font-semibold focus:outline-none focus:border-ninja-blue transition-colors"
              >
                {user.availableLocations?.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            ) : (
              <div className="text-ninja-muted text-sm font-ninja px-3 py-2 bg-ninja-bg border border-ninja-border rounded-lg">
                {user.activeLocation?.name ?? ''}
              </div>
            )}

            {/* Nav links */}
            <div className="flex flex-col gap-1">
              {user.role === 'manager' && (
                <>
                  <Link to="/manager/dashboard" onClick={closeMenu} className="text-ninja-navy hover:text-ninja-blue font-ninja font-semibold text-sm py-2 px-3 rounded-lg hover:bg-ninja-bg transition-colors">
                    Dashboard
                  </Link>
                  <Link to="/manager/students" onClick={closeMenu} className="text-ninja-navy hover:text-ninja-blue font-ninja font-semibold text-sm py-2 px-3 rounded-lg hover:bg-ninja-bg transition-colors">
                    Ninjas
                  </Link>
                  <Link to="/manager/staff" onClick={closeMenu} className="text-ninja-navy hover:text-ninja-blue font-ninja font-semibold text-sm py-2 px-3 rounded-lg hover:bg-ninja-bg transition-colors">
                    Senseis
                  </Link>
                </>
              )}
              {user.role === 'sensei' && (
                <>
                  <Link to="/sensei/dashboard" onClick={closeMenu} className="text-ninja-navy hover:text-ninja-blue font-ninja font-semibold text-sm py-2 px-3 rounded-lg hover:bg-ninja-bg transition-colors">
                    Dashboard
                  </Link>
                  <Link to="/manager/students" onClick={closeMenu} className="text-ninja-navy hover:text-ninja-blue font-ninja font-semibold text-sm py-2 px-3 rounded-lg hover:bg-ninja-bg transition-colors">
                    Ninjas
                  </Link>
                  <Link to="/manager/staff" onClick={closeMenu} className="text-ninja-navy hover:text-ninja-blue font-ninja font-semibold text-sm py-2 px-3 rounded-lg hover:bg-ninja-bg transition-colors">
                    Senseis
                  </Link>
                </>
              )}
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full border border-ninja-blue text-ninja-blue hover:bg-ninja-blue hover:text-white text-sm font-ninja font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
