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
    <div className="px-4 py-1.5 border-b border-ninja-border bg-ninja-bg flex items-center gap-2">
      <div className="w-5 h-5 rounded-md flex items-center justify-center text-ninja-blue bg-ninja-blue/10 font-ninja font-bold text-[10px] flex-shrink-0">
        {user.activeLocation?.name?.slice(0, 2).toUpperCase() || '?'}
      </div>
      <span className="text-ninja-navy font-ninja text-sm font-semibold truncate">{user.activeLocation?.name ?? ''}</span>
    </div>
  );
}

function TodayIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="2"/>
      <path strokeLinecap="round" strokeWidth="2" d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  );
}
function NinjasIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeWidth="2" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4" strokeWidth="2"/>
      <path strokeLinecap="round" strokeWidth="2" d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}
function ClubsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
    </svg>
  );
}
function SenseiIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M22 10v6M2 10l10-5 10 5-10 5-10-5z"/>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 12v5c3 3 9 3 12 0v-5"/>
    </svg>
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
    { to: dashPath, label: 'Today', icon: <TodayIcon /> },
    { to: '/manager/students', label: 'Ninjas', icon: <NinjasIcon /> },
    { to: '/clubs', label: 'Clubs', icon: <ClubsIcon /> },
    { to: '/manager/staff', label: 'Senseis', icon: <SenseiIcon /> },
    { to: '/account', label: 'Account', icon: <AccountIcon profilePicUrl={user.profilePicUrl} initials={initials} /> },
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
            {tab.icon}
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
