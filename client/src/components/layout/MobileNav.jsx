import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { getActiveTabIndex } from '../../lib/navTabs';

function LocationBar({ user, switchLocation }) {
  const glass = 'w-full rounded-xl border border-white/15 dark:border-white/10 bg-white/10 dark:bg-[#141826]/60 backdrop-blur-2xl text-ninja-navy px-3 py-1.5 font-ninja text-sm font-semibold shadow-lg shadow-black/30';
  if (['manager', 'admin'].includes(user.role)) {
    return (
      <select
        value={user.activeLocation?.id ?? ''}
        onChange={(e) => switchLocation(Number(e.target.value))}
        className={`${glass} focus:outline-none focus:border-ninja-blue transition-colors appearance-none`}
      >
        {user.availableLocations?.map((loc) => (
          <option key={loc.id} value={loc.id} className="bg-ninja-bg text-ninja-navy">{loc.name}</option>
        ))}
      </select>
    );
  }
  return (
    <div className={glass}>
      <span>{user.activeLocation?.name ?? ''}</span>
    </div>
  );
}

function TabIcon({ iconId, profilePicUrl, initials, active }) {
  if (iconId === null) {
    if (profilePicUrl) {
      return <img src={profilePicUrl} alt="me" className="w-6 h-6 rounded-full object-cover border border-white/25" />;
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
      className={`w-7 h-7 transition-all duration-200 ${active ? 'drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]' : 'opacity-45 grayscale-[0.35]'}`}
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
    <nav className="lg:hidden absolute bottom-0 inset-x-0 z-20 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 pointer-events-none">
      <div className="pointer-events-auto mb-1.5">
        <LocationBar user={isSenseiView ? { ...user, role: 'sensei' } : user} switchLocation={switchLocation} />
      </div>
      {/* Liquid glass capsule */}
      <div
        className="pointer-events-auto relative flex items-center justify-between gap-0.5 rounded-full border border-white/15 dark:border-white/10 bg-white/10 dark:bg-[#141826]/60 backdrop-blur-2xl px-2 py-2"
        style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.18), inset 0 -1px 1px rgba(0,0,0,0.15), 0 8px 32px rgba(0,0,0,0.4)' }}
      >
        {/* top sheen highlight */}
        <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent rounded-full" />
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
              className="relative flex-1 flex items-center justify-center h-12 rounded-full"
            >
              {active && (
                <motion.div
                  layoutId="mobileNavPill"
                  className="absolute inset-0 rounded-full border border-white/25 dark:border-white/15 bg-white/20 dark:bg-white/[0.12]"
                  style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.25), 0 2px 8px rgba(0,0,0,0.25)' }}
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
