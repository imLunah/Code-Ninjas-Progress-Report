import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { getMobileNavTabs, getActiveTabIndex } from '../../lib/navTabs';

function LocationBar({ user, switchLocation, compact }) {
  const glass = `rounded-full border border-white/25 dark:border-white/15 bg-white/[0.08] dark:bg-[#141826]/50 backdrop-blur-2xl backdrop-saturate-[1.8] text-ninja-navy font-ninja font-semibold shadow-lg shadow-black/30 transition-all duration-200 ${compact ? 'px-3 py-1 text-xs' : 'px-3.5 py-1.5 text-sm'}`;
  if (['manager', 'admin'].includes(user.role)) {
    return (
      <select
        value={user.activeLocation?.id ?? ''}
        onChange={(e) => switchLocation(Number(e.target.value))}
        className={`${glass} focus:outline-none focus:border-ninja-blue appearance-none`}
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

function TabIcon({ iconId, profilePicUrl, initials, active, compact }) {
  const avatar = compact ? 'w-5 h-5' : 'w-6 h-6';
  const icon = compact ? 'w-6 h-6' : 'w-7 h-7';
  if (iconId === null) {
    if (profilePicUrl) {
      return <img src={profilePicUrl} alt="me" className={`${avatar} rounded-full object-cover border border-white/25 transition-all duration-200`} />;
    }
    return (
      <div className={`${avatar} rounded-full bg-ninja-blue flex items-center justify-center text-white font-ninja font-bold text-[10px] transition-all duration-200`}>
        {initials}
      </div>
    );
  }
  return (
    <img
      src={`/icons/${iconId}.png`}
      alt=""
      className={`${icon} transition-all duration-200 ${active ? 'drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]' : 'opacity-45 grayscale-[0.35]'}`}
    />
  );
}

const PILL_SPRING = { type: 'spring', stiffness: 480, damping: 36, mass: 0.7 };

export default function MobileNav({ compact = false }) {
  const { user, switchLocation, viewAs } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  if (!user) return null;

  const isSenseiView = user.role === 'admin' && viewAs === 'sensei';
  const initials = user.displayName?.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?';

  const tabs = getMobileNavTabs(user, viewAs);
  const activeIndex = getActiveTabIndex(tabs, location.pathname);

  const tabSize = compact ? 'w-10 h-10' : 'w-12 h-12';

  return (
    <nav className="lg:hidden absolute bottom-0 inset-x-0 z-20 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 pointer-events-none flex flex-col items-center gap-1.5">
      <div className="pointer-events-auto">
        <LocationBar user={isSenseiView ? { ...user, role: 'sensei' } : user} switchLocation={switchLocation} compact={compact} />
      </div>
      {/* Liquid glass capsule — compact, centered */}
      <div
        className={`pointer-events-auto relative flex items-center gap-0.5 rounded-full overflow-hidden border border-white/25 dark:border-white/15 bg-white/[0.08] dark:bg-[#141826]/50 backdrop-blur-2xl backdrop-saturate-[1.8] transition-all duration-200 ${compact ? 'px-1.5 py-1' : 'px-2 py-1.5'}`}
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 1px 1px rgba(255,255,255,0.1), inset 0 1.5px 1px rgba(255,255,255,0.4), inset 0 -10px 22px rgba(0,0,0,0.18), inset 0 0 0 0.5px rgba(255,255,255,0.08)' }}
      >
        {/* glass body gradient (light pools at top, shadow at bottom) */}
        <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/20 via-white/[0.02] to-black/10 dark:from-white/[0.10] dark:via-transparent dark:to-black/25" />
        {/* specular top-left highlight blob */}
        <div className="pointer-events-none absolute -top-3 left-4 w-24 h-9 rounded-full bg-white/40 dark:bg-white/25 blur-2xl opacity-70" />
        {/* bright top edge sheen */}
        <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
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
              className={`relative flex items-center justify-center rounded-full transition-all duration-200 ${tabSize}`}
            >
              {active && (
                <motion.div
                  layoutId="mobileNavPill"
                  className="absolute inset-0 rounded-full overflow-hidden border border-white/35 dark:border-white/20 bg-white/25 dark:bg-white/[0.14]"
                  style={{ boxShadow: 'inset 0 1.5px 1px rgba(255,255,255,0.45), inset 0 -3px 5px rgba(0,0,0,0.15), 0 2px 10px rgba(0,0,0,0.22)' }}
                  transition={PILL_SPRING}
                >
                  <span className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 to-transparent dark:from-white/15" />
                </motion.div>
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
                  compact={compact}
                />
              </motion.span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
