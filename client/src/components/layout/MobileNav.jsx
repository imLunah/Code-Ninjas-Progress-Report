import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { getMobileNavTabs, getActiveTabIndex } from '../../lib/navTabs';

function LocationBar({ user, switchLocation, compact }) {
  const glass = `rounded-xl border border-white/25 dark:border-white/15 bg-white/[0.03] dark:bg-[#141826]/15 backdrop-saturate-[2] text-ninja-navy font-ninja font-semibold shadow-lg shadow-black/25 transition-all duration-200 ${compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'}`;
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
  const avatar = compact ? 'w-6 h-6' : 'w-7 h-7';
  const icon = compact ? 'w-7 h-7' : 'w-8 h-8';
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

  const tabSize = compact ? 'w-12 h-12' : 'w-14 h-14';

  return (
    <nav className="lg:hidden absolute bottom-0 inset-x-0 z-20 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 pointer-events-none flex flex-col items-center gap-1.5">
      <div className="pointer-events-auto">
        <LocationBar user={isSenseiView ? { ...user, role: 'sensei' } : user} switchLocation={switchLocation} compact={compact} />
      </div>
      {/* Liquid glass capsule — compact, centered */}
      <div
        className={`pointer-events-auto relative flex items-center gap-0.5 rounded-full overflow-hidden border border-white/25 dark:border-white/15 bg-white/[0.03] dark:bg-[#141826]/15 backdrop-saturate-[2] transition-all duration-200 ${compact ? 'px-2 py-1' : 'px-2.5 py-1.5'}`}
        style={{ boxShadow: 'inset 0 1.5px 1px rgba(255,255,255,0.3), inset 0 -1px 1px rgba(0,0,0,0.15), 0 8px 32px rgba(0,0,0,0.35)' }}
      >
        {/* mirror gloss — top-down reflection */}
        <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/25 via-white/[0.04] to-transparent dark:from-white/16" />
        {/* diagonal specular streak */}
        <div className="pointer-events-none absolute inset-0 rounded-full" style={{ background: 'linear-gradient(115deg, transparent 32%, rgba(255,255,255,0.28) 46%, rgba(255,255,255,0.06) 52%, transparent 62%)' }} />
        {/* bright top edge */}
        <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent rounded-full" />
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
