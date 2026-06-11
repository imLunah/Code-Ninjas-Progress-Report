import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getAccent, isDefaultAccent, DEFAULT_OPTION } from '../../lib/accents';
import ThemeCustomizerModal from '../theme/ThemeCustomizerModal';

function NavIcon({ id, svg }) {
  if (svg) {
    return (
      <span className="w-9 h-9 flex-shrink-0 flex items-center justify-center">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d={svg} />
        </svg>
      </span>
    );
  }
  return (
    <img
      src={`/icons/${id}.png`}
      alt=""
      className="w-9 h-9 flex-shrink-0"
    />
  );
}

function isLinkActive(link, pathname, search) {
  const linkPath = link.to.split('?')[0];
  const linkQuery = link.to.includes('?') ? link.to.split('?')[1] : null;

  if (linkQuery) {
    return pathname === linkPath && search.includes(linkQuery);
  }
  return pathname === link.to || (link.to.length > 1 && pathname.startsWith(link.to + '/'));
}

function BugIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

export default function Sidebar({ onOpenBug }) {
  const { user, logout, switchLocation, viewAs } = useAuth();
  const { dark, accent } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [themeOpen, setThemeOpen] = useState(false);
  const accentSwatch = isDefaultAccent(accent) ? DEFAULT_OPTION.swatch : getAccent(accent).swatch;

  const ROADMAP_LINK = { to: '/curriculum-roadmap', label: 'Roadmap', icon: 'roadmap' };

  const managerLinks = [
    { to: '/manager/dashboard', label: "Today's Board", icon: 'today' },
    { to: '/manager/students', label: 'Ninjas', icon: 'roster' },
    { to: '/clubs', label: 'Clubs', icon: 'clubs' },
    { to: '/manager/staff', label: 'Staff', icon: 'senseis' },
    { to: '/manager/reports', label: 'Reports', icon: 'report' },
    ROADMAP_LINK,
  ];

  const senseiLinks = [
    { to: '/sensei/dashboard', label: "Today's Board", icon: 'today' },
    { to: '/manager/students', label: 'Ninjas', icon: 'roster' },
    { to: '/clubs', label: 'Clubs', icon: 'clubs' },
    { to: '/manager/staff', label: 'Staff', icon: 'senseis' },
    { to: '/manager/reports', label: 'Reports', icon: 'report' },
    ROADMAP_LINK,
  ];

  const isSenseiView = user?.role === 'admin' && viewAs === 'sensei';
  const navLinks = isSenseiView ? senseiLinks : ['manager', 'admin'].includes(user?.role) ? managerLinks : user?.role === 'sensei' ? senseiLinks : [];

  const initials = user?.displayName?.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?';

  const handleLogout = async () => {
    try { await logout(); } catch {}
    navigate('/login');
  };

  return (
    <aside className="hidden lg:flex flex-col w-56 xl:w-60 bg-white border-r border-ninja-border flex-shrink-0 sticky top-0 h-screen z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-ninja-border">
        <img src="/DojoLinkLogoH.png" alt="DojoLink" className="h-14 w-auto" />
      </div>

      {/* Center switcher */}
      {user && (
        <div className="px-3 pt-3">
          {['manager', 'admin'].includes(user.role) && !isSenseiView ? (
            <select
              value={user.activeLocation?.id ?? ''}
              onChange={(e) => switchLocation(Number(e.target.value))}
              className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm font-semibold focus:outline-none focus:border-ninja-blue transition-colors"
            >
              {user.availableLocations?.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          ) : (
            <div className="px-3 py-2 bg-ninja-bg border border-ninja-border rounded-lg">
              <span className="text-ninja-navy font-ninja text-sm font-semibold truncate">{user.activeLocation?.name ?? ''}</span>
            </div>
          )}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 mt-2 overflow-y-auto">
        {navLinks.map((link) => {
          const isActive = isLinkActive(link, location.pathname, location.search);
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-ninja font-bold text-sm transition-colors relative ${
                isActive
                  ? 'bg-ninja-blue/10 text-ninja-blue'
                  : 'text-ninja-navy hover:bg-ninja-bg'
              }`}
            >
              {isActive && (
                <span className="absolute left-0 inset-y-2 w-0.5 bg-ninja-blue rounded-r-full" />
              )}
              <NavIcon id={link.icon} svg={link.svg} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Appearance — opens the theme customizer popup */}
      <div className="px-3 py-2 border-t border-ninja-border">
        <button
          type="button"
          onClick={() => setThemeOpen(true)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl
                     hover:bg-ninja-bg transition-colors group"
        >
          <span className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center text-ninja-muted bg-ninja-bg group-hover:bg-white transition-colors">
              {dark ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
              )}
            </span>
            <span className="text-ninja-navy font-ninja text-sm font-semibold">Appearance</span>
          </span>
          <span className="w-4 h-4 rounded-full ring-1 ring-black/10 flex-shrink-0" style={{ backgroundColor: accentSwatch }} />
        </button>
      </div>

      <ThemeCustomizerModal open={themeOpen} onClose={() => setThemeOpen(false)} />

      {/* User card */}
      <div className="p-3 border-t border-ninja-border">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <Link to="/account" className="flex items-center gap-2.5 flex-1 min-w-0 hover:opacity-80 transition-opacity">
            {user?.profilePicUrl ? (
              <img src={user.profilePicUrl} alt={user.displayName} className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-ninja-border" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-ninja-blue flex items-center justify-center text-white font-ninja font-bold text-xs flex-shrink-0">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-ninja font-bold text-ninja-navy text-sm truncate">{user?.displayName}</p>
              <p className="font-ninja text-ninja-muted text-xs capitalize">{user?.role === 'manager' ? 'Center Director' : user?.role === 'admin' ? 'Admin' : user?.role}</p>
            </div>
          </Link>
          <button
            onClick={onOpenBug}
            title="Report a bug"
            className="text-ninja-muted hover:text-ninja-red transition-colors flex-shrink-0 p-1"
          >
            <BugIcon />
          </button>
          <button
            onClick={handleLogout}
            title="Log out"
            className="text-ninja-muted hover:text-ninja-red transition-colors flex-shrink-0 p-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
