import { useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useMotionTemplate, useSpring } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../ui/ThemeToggle';

function NavIcon({ id, svg }) {
  if (svg) {
    return (
      <span className="relative w-9 h-9 flex-shrink-0 flex items-center justify-center">
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
      className="relative w-9 h-9 flex-shrink-0"
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
  const location = useLocation();
  const navigate = useNavigate();

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

  // Cursor-reactive ambient highlight — light refraction follows the pointer.
  // Spring-smoothed so reflections drift rather than snap. No re-render on move.
  const asideRef = useRef(null);
  const rawX = useMotionValue(50);
  const rawY = useMotionValue(-200);
  const mx = useSpring(rawX, { stiffness: 120, damping: 30, mass: 0.6 });
  const my = useSpring(rawY, { stiffness: 120, damping: 30, mass: 0.6 });

  const handleMouseMove = (e) => {
    const rect = asideRef.current?.getBoundingClientRect();
    if (!rect) return;
    rawX.set(((e.clientX - rect.left) / rect.width) * 100);
    rawY.set(((e.clientY - rect.top) / rect.height) * 100);
  };
  const handleMouseLeave = () => { rawY.set(-200); };

  const glow = useMotionTemplate`radial-gradient(420px circle at ${mx}% ${my}%, rgba(255,255,255,0.55), rgba(255,255,255,0) 55%)`;
  const glowDark = useMotionTemplate`radial-gradient(420px circle at ${mx}% ${my}%, rgba(120,160,255,0.10), rgba(255,255,255,0) 55%)`;

  return (
    <aside
      ref={asideRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="hidden lg:flex flex-col w-56 xl:w-60 relative flex-shrink-0 sticky top-0 h-screen z-40 bg-white/70 dark:bg-[#0c0f1a]/75 backdrop-blur-2xl backdrop-saturate-150 border-r border-white/40 dark:border-white/10"
      style={{ boxShadow: 'inset -1px 0 1px rgba(255,255,255,0.3), 1px 0 24px rgba(0,0,0,0.04)' }}
    >
      {/* Cursor-reactive ambient highlight — light refraction drifts with pointer */}
      <motion.div className="pointer-events-none absolute inset-0 z-0 dark:hidden" style={{ background: glow }} />
      <motion.div className="pointer-events-none absolute inset-0 z-0 hidden dark:block" style={{ background: glowDark }} />
      {/* Top edge sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 dark:via-white/15 to-transparent z-0" />

      {/* Logo */}
      <div className="relative z-10 px-5 py-5 border-b border-ninja-border">
        <img src="/DojoLinkLogoH.png" alt="DojoLink" className="h-14 w-auto" />
      </div>

      {/* Center switcher */}
      {user && (
        <div className="relative z-10 px-3 pt-3">
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
      <nav className="relative z-10 flex-1 p-3 space-y-0.5 mt-2 overflow-y-auto">
        {navLinks.map((link) => {
          const isActive = isLinkActive(link, location.pathname, location.search);
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-ninja font-bold text-sm transition-colors relative overflow-hidden ${
                isActive
                  ? 'text-ninja-blue bg-white/60 dark:bg-white/[0.06] border border-white/60 dark:border-white/[0.07]'
                  : 'text-ninja-navy hover:bg-white/40 dark:hover:bg-white/[0.04]'
              }`}
              style={isActive ? { boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.45), 0 4px 12px rgba(0,0,0,0.05)' } : undefined}
            >
              {isActive && (
                <>
                  <span className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-b from-white/40 to-transparent dark:from-white/[0.06]" />
                  <span className="absolute left-0 inset-y-2 w-0.5 bg-ninja-blue rounded-r-full" />
                </>
              )}
              <NavIcon id={link.icon} svg={link.svg} />
              <span className="relative">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Theme toggle */}
      <div className="relative z-10 px-4 py-2 flex items-center justify-between border-t border-ninja-border">
        <span className="text-ninja-muted font-ninja text-xs font-semibold">Appearance</span>
        <ThemeToggle />
      </div>

      {/* User card */}
      <div className="relative z-10 p-3 border-t border-ninja-border">
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
