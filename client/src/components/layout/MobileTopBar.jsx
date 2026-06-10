import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getTopNavTabs } from '../../lib/navTabs';

const GLASS = 'rounded-full border border-white/20 dark:border-white/12 bg-white/[0.04] dark:bg-[#0c0f1a]/55 backdrop-blur-sm backdrop-saturate-[1.9]';

// Liquid-glass backdrop: warps content behind (Chromium); iOS Safari falls back to blur.
const REFRACT = { backdropFilter: 'url(#liquidGlass) blur(1px) saturate(1.6)', WebkitBackdropFilter: 'blur(1px) saturate(1.6)' };

// Bar-chart / analytics icon for Reports
function ReportsIcon() {
  return (
    <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4v15a1 1 0 0 0 1 1h15" />
      <path d="M8 16v-4" />
      <path d="M13 16V8" />
      <path d="M18 16v-6" />
    </svg>
  );
}

// Open-book icon for Curriculum
function CurriculumIcon() {
  return (
    <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6.5C10.5 5.3 8.5 4.7 5.5 4.7c-.8 0-1.5.1-2 .3v13c.5-.2 1.2-.3 2-.3 3 0 5 .6 6.5 1.8" />
      <path d="M12 6.5C13.5 5.3 15.5 4.7 18.5 4.7c.8 0 1.5.1 2 .3v13c-.5-.2-1.2-.3-2-.3-3 0-5 .6-6.5 1.8" />
      <path d="M12 6.5v13" />
    </svg>
  );
}

const TOP_ICONS = { '/manager/reports': ReportsIcon, '/curriculum-roadmap': CurriculumIcon };

function TopIcon({ tab, active }) {
  const navigate = useNavigate();
  const Icon = TOP_ICONS[tab.to];
  return (
    <motion.button
      onClick={() => { if (!active) navigate(tab.to); }}
      whileTap={{ scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
      aria-label={tab.label}
      aria-current={active ? 'page' : undefined}
      className={`relative flex items-center justify-center w-11 h-11 overflow-hidden ${GLASS} transition-colors ${active ? 'text-ninja-blue' : 'text-ninja-navy/70'}`}
      style={{ ...REFRACT, boxShadow: 'inset 0 1px 1.5px rgba(255,255,255,0.28), inset 0 -1px 1px rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.14)' }}
    >
      <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/20 to-transparent dark:from-white/[0.07]" />
      <span className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-white/60 dark:via-white/20 to-transparent" />
      <span className="relative z-10 flex items-center justify-center">{Icon && <Icon />}</span>
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
