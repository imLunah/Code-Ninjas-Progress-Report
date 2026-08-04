import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../ui/ThemeToggle';
import { RocketIcon } from '../ui/icons';
import { LogOutIcon } from 'lucide-react';
import { managerLinks, senseiLinks, isLinkActive } from './Sidebar';

// Experimental desktop layout: the sidebar's contents rearranged into a
// horizontal bar. Mobile keeps the floating capsule nav either way, so this
// only ever renders at lg and up.
export default function TopNav({ onOpenBug }) {
  const { user, logout, switchLocation, viewAs } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isSenseiView = user?.role === 'admin' && viewAs === 'sensei';
  const navLinks = isSenseiView ? senseiLinks : ['manager', 'admin'].includes(user?.role) ? managerLinks : user?.role === 'sensei' ? senseiLinks : [];

  const initials = user?.displayName?.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?';
  const canSwitch = (['manager', 'admin'].includes(user?.role) || (user?.availableLocations?.length > 1)) && !isSenseiView;

  const handleLogout = async () => {
    try { await logout(); } catch {}
    navigate('/login');
  };

  return (
    <header className="hidden lg:flex sticky top-0 z-40 h-16 items-center gap-5 bg-white border-b border-ninja-border px-6 flex-shrink-0">
      <Link to="/" className="flex-shrink-0 outline-none" aria-label="DojoLink">
        <img src="/DojoLinkLogoH.webp" alt="DojoLink" width="800" height="420" className="h-10 w-auto select-none" draggable={false} />
      </Link>

      <nav className="flex items-center gap-1 min-w-0 overflow-x-auto no-scrollbar">
        {navLinks.map((link) => {
          const isActive = isLinkActive(link, location.pathname, location.search);
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl font-ninja font-bold text-sm transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-ninja-blue/10 text-ninja-blue-ink'
                  : 'text-ninja-navy hover:bg-ninja-bg'
              }`}
            >
              {link.Glyph
                ? <link.Glyph className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.8} />
                : <img src={`/icons/${link.icon}.png`} alt="" className="w-6 h-6 flex-shrink-0" />}
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-2.5 flex-shrink-0">
        {user && (canSwitch ? (
          <select
            aria-label="Active center"
            value={user.activeLocation?.id ?? ''}
            onChange={(e) => switchLocation(Number(e.target.value))}
            className="max-w-[11rem] bg-white border border-ninja-border text-ninja-navy rounded-lg px-3 py-1.5 font-ninja text-sm font-semibold focus:outline-none focus:border-ninja-blue transition-colors"
          >
            {user.availableLocations?.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        ) : (
          <span className="px-3 py-1.5 bg-ninja-bg border border-ninja-border rounded-lg text-ninja-navy font-ninja text-sm font-semibold whitespace-nowrap">
            {user.activeLocation?.name ?? ''}
          </span>
        ))}

        <ThemeToggle />

        <button
          onClick={onOpenBug}
          title="Report a bug or suggest a feature"
          className="text-ninja-muted hover:text-ninja-red transition-colors p-1"
        >
          <RocketIcon className="w-4 h-4 flex-shrink-0" />
        </button>

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
    </header>
  );
}
