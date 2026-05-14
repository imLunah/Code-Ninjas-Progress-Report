import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function NavIcon({ id }) {
  if (id === 'today') return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="2"/>
      <path strokeLinecap="round" strokeWidth="2" d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  );
  if (id === 'roster') return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeWidth="2" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4" strokeWidth="2"/>
      <path strokeLinecap="round" strokeWidth="2" d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
  if (id === 'clubs') return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
    </svg>
  );
  if (id === 'senseis') return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M22 10v6M2 10l10-5 10 5-10 5-10-5z"/>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 12v5c3 3 9 3 12 0v-5"/>
    </svg>
  );
  return null;
}

function isLinkActive(link, pathname, search) {
  const linkPath = link.to.split('?')[0];
  const linkQuery = link.to.includes('?') ? link.to.split('?')[1] : null;

  if (linkQuery) {
    return pathname === linkPath && search.includes(linkQuery);
  }
  return pathname === link.to || (link.to.length > 1 && pathname.startsWith(link.to + '/'));
}

export default function Sidebar() {
  const { user, logout, switchLocation } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const managerLinks = [
    { to: '/manager/dashboard', label: "Today's Board", icon: 'today' },
    { to: '/manager/students', label: 'Ninjas', icon: 'roster' },
    { to: '/clubs', label: 'Clubs', icon: 'clubs' },
    { to: '/manager/staff', label: 'Senseis', icon: 'senseis' },
  ];

  const senseiLinks = [
    { to: '/sensei/dashboard', label: "Today's Board", icon: 'today' },
    { to: '/manager/students', label: 'Ninjas', icon: 'roster' },
    { to: '/clubs', label: 'Clubs', icon: 'clubs' },
  ];

  const navLinks = user?.role === 'manager' ? managerLinks : user?.role === 'sensei' ? senseiLinks : [];

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
          {user.role === 'manager' ? (
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
            <div className="flex items-center gap-2 px-3 py-2 bg-ninja-bg border border-ninja-border rounded-lg">
              <div className="w-6 h-6 rounded-md flex items-center justify-center text-ninja-blue bg-ninja-blue/10 font-ninja font-bold text-xs flex-shrink-0">
                {user.activeLocation?.name?.slice(0, 2).toUpperCase() || '?'}
              </div>
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
              <NavIcon id={link.icon} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

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
              <p className="font-ninja text-ninja-muted text-xs capitalize">{user?.role === 'manager' ? 'Center Director' : user?.role}</p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="text-ninja-muted hover:text-ninja-red font-ninja text-xs font-semibold transition-colors flex-shrink-0"
          >
            Out
          </button>
        </div>
      </div>
    </aside>
  );
}
