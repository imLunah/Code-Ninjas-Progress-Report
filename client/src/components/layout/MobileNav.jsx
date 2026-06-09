import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { getActiveTabIndex } from '../../lib/navTabs';

function LocationBar({ user, switchLocation }) {
  if (['manager', 'admin'].includes(user.role)) {
    return (
      <div className="px-4 py-1.5 bg-ninja-bg">
        <select
          value={user.activeLocation?.id ?? ''}
          onChange={(e) => switchLocation(Number(e.target.value))}
          className="w-full bg-ninja-border/20 border border-ninja-border text-ninja-navy rounded-lg px-3 py-1.5 font-ninja text-sm font-semibold focus:outline-none focus:border-ninja-blue transition-colors"
        >
          {user.availableLocations?.map((loc) => (
            <option key={loc.id} value={loc.id}>{loc.name}</option>
          ))}
        </select>
      </div>
    );
  }
  return (
    <div className="px-4 py-1.5 bg-ninja-bg">
      <span className="text-ninja-navy font-ninja text-sm font-semibold">{user.activeLocation?.name ?? ''}</span>
    </div>
  );
}

function TabIcon({ iconId, profilePicUrl, initials, active }) {
  if (iconId === null) {
    if (profilePicUrl) {
      return <img src={profilePicUrl} alt="me" className="w-6 h-6 rounded-full object-cover border border-ninja-border" />;
    }
    return (
      <div className="w-6 h-6 rounded-full bg-ninja-blue flex items-center justify-center text-white font-ninja font-bold text-[10px]">
        {initials}
      </div>
    );
  }
  return (
    <img
      src={`/icons/${iconId}.png`}
      alt=""
      className={`w-7 h-7 transition-all duration-200 ${active ? '' : 'opacity-45 grayscale-[0.35]'}`}
    />
  );
}

const PILL_SPRING = { type: 'spring', stiffness: 480, damping: 36, mass: 0.7 };

export default function MobileNav() {
  const { user, switchLocation, viewAs } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  if (!user) return null;

  const isSenseiView = user.role === 'admin' && viewAs === 'sensei';
  const isManager = ['manager', 'admin'].includes(user.role) && !isSenseiView;
  const dashPath = isManager ? '/manager/dashboard' : '/sensei/dashboard';
  const initials = user.displayName?.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?';

  const tabs = [
    { to: dashPath, label: 'Today', iconId: 'today' },
    { to: '/manager/students', label: 'Ninjas', iconId: 'roster' },
    { to: '/clubs', label: 'Clubs', iconId: 'clubs' },
    { to: '/manager/staff', label: 'Staff', iconId: 'staff' },
    { to: '/manager/reports', label: 'Reports', iconId: 'report' },
    { to: '/curriculum-roadmap', label: 'Roadmap', iconId: 'roadmap' },
    { to: '/account', label: 'Account', iconId: null },
  ];

  const activeIndex = getActiveTabIndex(tabs, location.pathname);

  return (
    <nav className="lg:hidden flex-shrink-0 bg-ninja-bg px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-1">
      <LocationBar user={isSenseiView ? { ...user, role: 'sensei' } : user} switchLocation={switchLocation} />
      <div className="mt-1.5 flex items-center justify-between rounded-full border border-ninja-border bg-ninja-border/15 backdrop-blur-xl px-1.5 py-1.5 shadow-lg shadow-black/25">
        {tabs.map((tab, i) => {
          const active = i === activeIndex;
          return (
            <motion.button
              key={tab.to}
              onClick={() => { if (!active) navigate(tab.to); }}
              whileTap={{ scale: 0.82 }}
              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
              className="relative flex-1 flex items-center justify-center h-11 rounded-full"
            >
              {active && (
                <motion.div
                  layoutId="mobileNavPill"
                  className="absolute inset-x-0.5 inset-y-0 rounded-full bg-ninja-blue/20 border border-ninja-blue/30"
                  transition={PILL_SPRING}
                />
              )}
              <motion.span
                className="relative z-10 flex items-center justify-center"
                animate={{ scale: active ? 1.12 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 26 }}
              >
                <TabIcon
                  iconId={tab.iconId}
                  profilePicUrl={user.profilePicUrl}
                  initials={initials}
                  active={active}
                />
              </motion.span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
