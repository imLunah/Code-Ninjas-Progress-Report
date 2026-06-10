import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getTopNavTabs } from '../../lib/navTabs';

const GLASS = 'rounded-full border border-white/15 dark:border-white/10 bg-white/10 dark:bg-[#141826]/60 backdrop-blur-2xl';

function TopIcon({ tab, active }) {
  const navigate = useNavigate();
  return (
    <motion.button
      onClick={() => { if (!active) navigate(tab.to); }}
      whileTap={{ scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
      aria-label={tab.label}
      aria-current={active ? 'page' : undefined}
      className={`relative flex items-center justify-center w-11 h-11 ${GLASS}`}
      style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.18), 0 6px 20px rgba(0,0,0,0.3)' }}
    >
      <img
        src={`/icons/${tab.iconId}.png`}
        alt=""
        className={`w-6 h-6 ${active ? 'drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]' : 'opacity-55 grayscale-[0.3]'}`}
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
    <motion.header
      animate={{
        opacity: compact ? 0 : 1,
        filter: compact ? 'blur(10px)' : 'blur(0px)',
        y: compact ? -12 : 0,
      }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="lg:hidden absolute top-0 inset-x-0 z-20 px-3 pt-[max(env(safe-area-inset-top),8px)] pb-2 pointer-events-none flex items-start justify-between gap-2"
    >
      <div className={compact ? 'pointer-events-none' : 'pointer-events-auto'}>
        <TopIcon tab={left} active={leftActive} />
      </div>
      <div className={compact ? 'pointer-events-none' : 'pointer-events-auto'}>
        <TopIcon tab={right} active={rightActive} />
      </div>
    </motion.header>
  );
}
