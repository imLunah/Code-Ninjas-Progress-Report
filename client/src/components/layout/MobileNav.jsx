import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { getMobileNavTabs, getActiveTabIndex } from '../../lib/navTabs';

const GLASS = 'border border-white/20 dark:border-white/12 bg-white/[0.04] dark:bg-[#141826]/20 backdrop-blur-sm backdrop-saturate-[1.9]';

function LocationBar({ user, switchLocation }) {
  const glass = `rounded-xl ${GLASS} text-ninja-navy font-ninja font-semibold shadow-[0_2px_6px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.12)] px-3 py-1.5 text-sm`;
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
      className={`w-7 h-7 transition-opacity duration-200 ${active ? 'drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]' : 'opacity-45 grayscale-[0.35]'}`}
    />
  );
}

const PILL_SPRING = { type: 'spring', stiffness: 480, damping: 36, mass: 0.7 };
const SCALE_SPRING = { type: 'spring', stiffness: 320, damping: 30 };

export default function MobileNav({ compact = false }) {
  const { user, switchLocation, viewAs } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  if (!user) return null;

  const isSenseiView = user.role === 'admin' && viewAs === 'sensei';
  const initials = user.displayName?.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?';

  const tabs = getMobileNavTabs(user, viewAs);
  const activeIndex = getActiveTabIndex(tabs, location.pathname);

  return (
    <nav className="lg:hidden absolute bottom-0 inset-x-0 z-20 px-2 pb-[max(env(safe-area-inset-bottom),22px)] pt-2 pointer-events-none flex flex-col items-center">
      {/* Whole stack scales as one unit on scroll — no per-icon reflow */}
      <motion.div
        className="w-full flex flex-col items-center gap-2 origin-bottom"
        animate={{ scale: compact ? 0.86 : 1 }}
        transition={SCALE_SPRING}
      >
        <div className="pointer-events-auto">
          <LocationBar user={isSenseiView ? { ...user, role: 'sensei' } : user} switchLocation={switchLocation} />
        </div>
        {/* Liquid glass capsule */}
        <div
          className={`pointer-events-auto relative w-full max-w-xs flex items-center justify-between rounded-full overflow-hidden px-4 py-1.5 ${GLASS}`}
          style={{ boxShadow: 'inset 0 1px 1.5px rgba(255,255,255,0.28), inset 0 -1px 1px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.06), 0 12px 36px rgba(0,0,0,0.16)' }}
        >
          {/* refraction gloss — light sheen down the top half */}
          <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/20 via-white/[0.05] to-transparent dark:from-white/[0.07]" />
          {/* ambient highlight — soft light source, upper-center */}
          <div className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 w-40 h-12 rounded-full bg-white/30 dark:bg-white/[0.05] blur-2xl" />
          {/* top sheen highlight — crisp edge catch */}
          <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/70 dark:via-white/25 to-transparent rounded-full" />
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
                className="relative flex items-center justify-center rounded-full w-12 h-12"
              >
                {active && (
                  <motion.div
                    layoutId="mobileNavPill"
                    className="absolute inset-0 rounded-full border border-white/30 dark:border-white/10 bg-white/25 dark:bg-white/[0.08] overflow-hidden"
                    style={{ boxShadow: 'inset 0 1px 1.5px rgba(255,255,255,0.45), inset 0 -1px 2px rgba(255,255,255,0.12), 0 4px 12px rgba(0,0,0,0.10)' }}
                    transition={PILL_SPRING}
                  >
                    {/* inner glow */}
                    <span className="absolute inset-0 rounded-full bg-gradient-to-b from-white/25 to-transparent dark:from-white/[0.05]" />
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
                  />
                </motion.span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </nav>
  );
}
