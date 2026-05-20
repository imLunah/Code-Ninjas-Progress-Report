import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function LocationBar({ user, switchLocation }) {
  if (user.role === 'manager') {
    return (
      <div className="px-4 py-1.5 border-b border-ninja-border bg-ninja-bg">
        <select
          value={user.activeLocation?.id ?? ''}
          onChange={(e) => switchLocation(Number(e.target.value))}
          className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-3 py-1.5 font-ninja text-sm font-semibold focus:outline-none focus:border-ninja-blue transition-colors"
        >
          {user.availableLocations?.map((loc) => (
            <option key={loc.id} value={loc.id}>{loc.name}</option>
          ))}
        </select>
      </div>
    );
  }
  return (
    <div className="px-4 py-1.5 border-b border-ninja-border bg-ninja-bg">
      <span className="text-ninja-navy font-ninja text-sm font-semibold">{user.activeLocation?.name ?? ''}</span>
    </div>
  );
}

function NavTabIcon({ id, isActive }) {
  return (
    <img
      src={`/icons/${id}.png`}
      alt=""
      className={`w-7 h-7 transition-opacity ${isActive ? 'opacity-100' : 'opacity-40'}`}
    />
  );
}
function AccountIcon({ profilePicUrl, initials }) {
  if (profilePicUrl) {
    return <img src={profilePicUrl} alt="me" className="w-6 h-6 rounded-full object-cover border border-ninja-border" />;
  }
  return (
    <div className="w-6 h-6 rounded-full bg-ninja-blue flex items-center justify-center text-white font-ninja font-bold text-[10px]">
      {initials}
    </div>
  );
}

export default function MobileNav() {
  const { user, switchLocation } = useAuth();
  if (!user) return null;

  const isManager = user.role === 'manager';
  const dashPath = isManager ? '/manager/dashboard' : '/sensei/dashboard';
  const initials = user.displayName?.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?';

  const tabs = [
    { to: dashPath, label: 'Today', iconId: 'today' },
    { to: '/manager/students', label: 'Ninjas', iconId: 'roster' },
    { to: '/clubs', label: 'Clubs', iconId: 'clubs' },
    { to: '/manager/staff', label: 'Staff', iconId: 'staff' },
    { to: '/account', label: 'Account', iconId: null },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-ninja-border">
      <LocationBar user={user} switchLocation={switchLocation} />
      <div className="flex items-stretch">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-ninja font-semibold transition-colors ${
                isActive ? 'text-ninja-blue' : 'text-ninja-muted'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {tab.iconId
                  ? <NavTabIcon id={tab.iconId} isActive={isActive} />
                  : <AccountIcon profilePicUrl={user.profilePicUrl} initials={initials} />
                }
                {tab.label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
