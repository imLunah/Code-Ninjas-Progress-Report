import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import ThemeToggle from '../ui/ThemeToggle';
import { getTopNavTabs } from '../../lib/navTabs';

const GLASS = 'rounded-full border border-white/15 dark:border-white/10 bg-white/10 dark:bg-[#141826]/60 backdrop-blur-2xl';

function TopIcon({ tab, active, compact }) {
  const navigate = useNavigate();
  const size = compact ? 'w-9 h-9' : 'w-11 h-11';
  const img = compact ? 'w-5 h-5' : 'w-6 h-6';
  return (
    <motion.button
      onClick={() => { if (!active) navigate(tab.to); }}
      whileTap={{ scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
      aria-label={tab.label}
      aria-current={active ? 'page' : undefined}
      className={`pointer-events-auto relative flex items-center justify-center ${size} ${GLASS} transition-all duration-200`}
      style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.18), 0 6px 20px rgba(0,0,0,0.3)' }}
    >
      <img
        src={`/icons/${tab.iconId}.png`}
        alt=""
        className={`${img} transition-all duration-200 ${active ? 'drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]' : 'opacity-55 grayscale-[0.3]'}`}
      />
    </motion.button>
  );
}

export default function MobileTopBar({ compact = false }) {
  const location = useLocation();
  const { left, right } = getTopNavTabs();

  const leftActive = location.pathname.startsWith(left.to);
  const rightActive = location.pathname.startsWith(right.to);

  return (
    <header className="lg:hidden absolute top-0 inset-x-0 z-20 px-3 pt-[max(env(safe-area-inset-top),8px)] pb-2 pointer-events-none flex items-start justify-between gap-2">
      <TopIcon tab={left} active={leftActive} compact={compact} />
      <div className="flex items-center gap-2">
        <div className={`pointer-events-auto flex items-center justify-center ${GLASS} ${compact ? 'w-9 h-9' : 'w-11 h-11'} transition-all duration-200`}>
          <ThemeToggle className="!bg-transparent hover:!bg-white/10 !w-full !h-full !rounded-full" />
        </div>
        <TopIcon tab={right} active={rightActive} compact={compact} />
      </div>
    </header>
  );
}
