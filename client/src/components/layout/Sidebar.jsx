import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../ui/ThemeToggle';
import { RocketIcon } from '../ui/icons';
import { LogOutIcon } from 'lucide-react';
import { LayoutGridIcon } from 'lucide-react';

const EXPANDED_W = 224; // matches w-56
const COLLAPSED_W = 76; // icon rail

function NavIcon({ id, Glyph }) {
  if (Glyph) {
    return (
      <span className="w-9 h-9 flex-shrink-0 flex items-center justify-center">
        <Glyph className="w-5 h-5" strokeWidth={1.8} />
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
    <RocketIcon className="w-4 h-4 flex-shrink-0" />
  );
}

const managerLinks = [
  { to: '/manager/overview', label: 'Dashboard', Glyph: LayoutGridIcon },
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
];

export default function Sidebar({ onOpenBug }) {
  const { user, logout, switchLocation, viewAs } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === '1');

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      localStorage.setItem('sidebar-collapsed', c ? '0' : '1');
      return !c;
    });
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

      {/* Logo */}
      <div className={`py-5 border-b border-ninja-border overflow-hidden ${collapsed ? 'px-2 flex justify-center' : 'px-5'}`}>
        <Link to="/" className="block outline-none" aria-label="DojoLink">
          {collapsed ? (
            <img src="/favicon.png" alt="DojoLink" className="h-9 w-9 select-none" draggable={false} />
          ) : (
            <img src="/DojoLinkLogoH.png" alt="DojoLink" className="h-14 w-auto max-w-none select-none" draggable={false} />
          )}
        </Link>
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
              <NavIcon id={link.icon} Glyph={link.Glyph} />
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
              <LogOutIcon className="w-4 h-4" />
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
              <LogOutIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
