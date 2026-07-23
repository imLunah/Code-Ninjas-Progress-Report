import { useState, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../ui/ThemeToggle';
import ThemeCustomizerModal from '../theme/ThemeCustomizerModal';

const EXPANDED_W = 224; // matches w-56
const COLLAPSED_W = 76; // icon rail

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
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
    </svg>
  );
}

const managerLinks = [
  { to: '/manager/overview', label: 'Dashboard', svg: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25A2.25 2.25 0 0113.5 8.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z' },
  { to: '/manager/dashboard', label: "Today's Board", icon: 'today' },
  { to: '/manager/students', label: 'Ninjas', icon: 'roster' },
  { to: '/clubs', label: 'Clubs', icon: 'clubs' },
  { to: '/manager/staff', label: 'Staff', icon: 'senseis' },
];

const senseiLinks = [
  { to: '/sensei/dashboard', label: "Today's Board", icon: 'today' },
  { to: '/manager/students', label: 'Ninjas', icon: 'roster' },
  { to: '/clubs', label: 'Clubs', icon: 'clubs' },
  { to: '/manager/staff', label: 'Staff', icon: 'senseis' },
  { to: '/manager/reports', label: 'Reports', icon: 'report' },
];

export default function Sidebar({ onOpenBug }) {
  const { user, logout, switchLocation, viewAs } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [themeOpen, setThemeOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === '1');

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      localStorage.setItem('sidebar-collapsed', c ? '0' : '1');
      return !c;
    });
  };

  // Secret: tap the logo 5× quickly to open the theme customizer.
  const tapCount = useRef(0);
  const tapTimer = useRef(null);
  const handleLogoTap = () => {
    tapCount.current += 1;
    clearTimeout(tapTimer.current);
    if (tapCount.current >= 5) {
      tapCount.current = 0;
      setThemeOpen(true);
      return;
    }
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 1200);
  };

  const isSenseiView = user?.role === 'admin' && viewAs === 'sensei';
  const navLinks = isSenseiView ? senseiLinks : ['manager', 'admin'].includes(user?.role) ? managerLinks : user?.role === 'sensei' ? senseiLinks : [];

  const initials = user?.displayName?.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?';

  const handleLogout = async () => {
    try { await logout(); } catch {}
    navigate('/login');
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? COLLAPSED_W : EXPANDED_W }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      className="hidden lg:flex flex-col bg-white border-r border-ninja-border flex-shrink-0 sticky top-0 h-screen z-40"
    >
      {/* Collapse toggle — floats on the sidebar edge */}
      <button
        type="button"
        onClick={toggleCollapsed}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute -right-3 top-[72px] z-50 w-6 h-6 rounded-full bg-white border border-ninja-border shadow-sm flex items-center justify-center text-ninja-muted hover:text-ninja-blue hover:border-ninja-blue/50 transition-colors"
      >
        <motion.svg
          animate={{ rotate: collapsed ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </motion.svg>
      </button>

      {/* Logo (secret: 5 taps opens the theme customizer) */}
      <div className={`py-5 border-b border-ninja-border overflow-hidden ${collapsed ? 'px-2 flex justify-center' : 'px-5'}`}>
        <button type="button" onClick={handleLogoTap} className="block outline-none" aria-label="DojoLink">
          {collapsed ? (
            <img src="/favicon.png" alt="DojoLink" className="h-9 w-9 select-none" draggable={false} />
          ) : (
            <img src="/DojoLinkLogoH.png" alt="DojoLink" className="h-14 w-auto max-w-none select-none" draggable={false} />
          )}
        </button>
      </div>

      {/* Center switcher (hidden on the icon rail) */}
      {user && !collapsed && (
        <div className="px-3 pt-3">
          {(['manager', 'admin'].includes(user.role) || (user.availableLocations?.length > 1)) && !isSenseiView ? (
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
              title={collapsed ? link.label : undefined}
              className={`flex items-center gap-3 py-2.5 rounded-xl font-ninja font-bold text-sm transition-colors relative overflow-hidden whitespace-nowrap ${
                collapsed ? 'px-0 justify-center' : 'px-3'
              } ${
                isActive
                  ? 'bg-ninja-blue/10 text-ninja-blue'
                  : 'text-ninja-navy hover:bg-ninja-bg'
              }`}
            >
              <NavIcon id={link.icon} svg={link.svg} />
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15, delay: 0.08 }}>
                  {link.label}
                </motion.span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Theme toggle */}
      <div className={`py-2 flex items-center border-t border-ninja-border ${collapsed ? 'px-0 justify-center' : 'px-4 justify-between'}`}>
        {!collapsed && <span className="text-ninja-muted font-ninja text-xs font-semibold">Appearance</span>}
        <ThemeToggle />
      </div>

      <ThemeCustomizerModal open={themeOpen} onClose={() => setThemeOpen(false)} />

      {/* User card */}
      <div className="p-3 border-t border-ninja-border">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2 py-1">
            <Link to="/account" title="Account" className="hover:opacity-80 transition-opacity">
              {user?.profilePicUrl ? (
                <img src={user.profilePicUrl} alt={user.displayName} className="w-8 h-8 rounded-full object-cover border border-ninja-border" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-ninja-blue flex items-center justify-center text-white font-ninja font-bold text-xs">
                  {initials}
                </div>
              )}
            </Link>
            <button
              onClick={handleLogout}
              title="Log out"
              className="text-ninja-muted hover:text-ninja-red transition-colors p-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        ) : (
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
              title="Report a bug or suggest a feature"
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
        )}
      </div>
    </motion.aside>
  );
}
