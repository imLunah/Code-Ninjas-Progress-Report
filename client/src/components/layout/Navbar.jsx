import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

function useUnreadCount(user) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const check = async () => {
      try {
        const threads = await api.get('/messages/threads');
        setCount(threads.filter((t) => t.is_unread).length);
      } catch {}
    };

    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [user]);

  return count;
}

export default function Navbar() {
  const { user, logout, switchLocation } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const unreadCount = useUnreadCount(user);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const closeMenu = () => setMenuOpen(false);

  const navLinks = user?.role === 'manager'
    ? [
        { to: '/manager/dashboard', label: 'Dashboard' },
        { to: '/manager/students', label: 'Ninjas' },
        { to: '/clubs', label: 'Clubs' },
        { to: '/manager/staff', label: 'Senseis' },
      ]
    : user?.role === 'sensei'
    ? [
        { to: '/sensei/dashboard', label: 'Dashboard' },
        { to: '/manager/students', label: 'Ninjas' },
        { to: '/clubs', label: 'Clubs' },
        { to: '/manager/staff', label: 'Senseis' },
      ]
    : [];

  return (
    <nav className="bg-white border-b border-ninja-border sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-24">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link to="/">
              <img src="/DojoLinkLogoH.png" alt="Code Ninjas" className="h-20" />
            </Link>
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

          {/* Desktop: Nav links */}
          {user && (
            <div className="hidden lg:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="text-ninja-muted hover:text-ninja-blue font-ninja font-semibold text-sm tracking-wide transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {/* Desktop: Bell + user + logout */}
          {user && (
            <div className="hidden lg:flex items-center gap-4">
              {/* Parent message bell */}
              <Link
                to="/messages"
                className="relative p-2 text-ninja-muted hover:text-ninja-blue transition-colors"
                aria-label="Parent messages"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 bg-ninja-red text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

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
              className="lg:hidden p-2 text-ninja-navy rounded-lg hover:bg-ninja-bg transition-colors relative"
              aria-label="Toggle menu"
            >
              {menuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-ninja-red text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </>
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
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={closeMenu}
                  className="text-ninja-navy hover:text-ninja-blue font-ninja font-semibold text-sm py-2 px-3 rounded-lg hover:bg-ninja-bg transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                to="/messages"
                onClick={closeMenu}
                className="text-ninja-navy hover:text-ninja-blue font-ninja font-semibold text-sm py-2 px-3 rounded-lg hover:bg-ninja-bg transition-colors flex items-center justify-between"
              >
                <span>Messages</span>
                {unreadCount > 0 && (
                  <span className="bg-ninja-red text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
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
