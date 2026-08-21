import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HomeIcon, BookOpenIcon, UserRoundIcon } from 'lucide-react';
import { useParentAuth } from '../../context/ParentAuthContext';
import { useParentPortal } from '../../context/ParentPortalContext';
import ThemeToggle from '../ui/ThemeToggle';
import Logo from '../ui/Logo';
import Segmented from '../ui/Segmented';
import BugReportButton from '../ui/BugReportButton';
import { RocketIcon } from '../ui/icons';

// The parent portal's shell.
//
// A flat page. On desktop one white bar runs edge to edge with a hairline
// under it: the logo, the section switcher in the middle, the child switcher
// and the account on the right. On a phone the bar is just the logo and the
// account, the pages carry their own large titles, and the sections live in a
// floating capsule at the bottom, the same material as the staff nav.

const TABS = [
  { to: '/parent/dashboard', label: 'Home',    Glyph: HomeIcon },
  { to: '/parent/courses',   label: 'Courses', Glyph: BookOpenIcon },
];

// Same look as MobileNav: near-transparent capsule, refracting where the browser can.
const GLASS = 'border border-white/30 dark:border-white/12 bg-white/[0.55] dark:bg-[#0c0f1a]/55 backdrop-blur-xl backdrop-saturate-[1.9] shadow-[0_14px_40px_rgb(26_46_74/0.18)] dark:shadow-[0_14px_40px_rgb(0_0_0/0.45)]';
const REFRACT = { backdropFilter: 'url(#liquidGlass) blur(22px) saturate(1.8)', WebkitBackdropFilter: 'blur(22px) saturate(1.8)' };

function isActive(pathname, to) {
  return pathname === to || pathname.startsWith(to + '/');
}

// Which child the pages are about. Home also offers "All"; everywhere else it
// is one child. Hidden when there is only one child, because a choice with
// one option is not a choice.
export function ChildSwitcher({ withAll = false, size = 'sm', layoutId = 'parent-child' }) {
  const portal = useParentPortal();
  if (!portal?.students || portal.students.length < 2) return null;
  const options = [
    ...(withAll ? [{ value: 'all', label: 'All' }] : []),
    ...portal.students.map((s) => ({ value: s.id, label: s.full_name.split(' ')[0] })),
  ];
  const value = withAll && portal.viewAll ? 'all' : portal.activeId;
  const onChange = (v) => {
    if (v === 'all') { portal.setViewAll(true); return; }
    portal.setActiveId(v);
    portal.setViewAll(false);
  };
  return <Segmented options={options} value={value} onChange={onChange} label="Which ninja" layoutId={layoutId} size={size} />;
}

function ParentTabBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { activeId } = useParentPortal();
  const tabs = [...TABS, { to: activeId ? `/parent/students/${activeId}` : '/parent/dashboard', match: '/parent/students', label: 'Profile', Glyph: UserRoundIcon }];
  return (
    <nav
      aria-label="Parent portal"
      className={`lg:hidden fixed left-1/2 -translate-x-1/2 bottom-[max(1.1rem,env(safe-area-inset-bottom))] z-40 flex items-center gap-0.5 p-1.5 rounded-full ${GLASS}`}
      style={REFRACT}
    >
      {tabs.map((t) => {
        const active = isActive(pathname, t.match || t.to);
        return (
          <button
            key={t.label}
            type="button"
            onClick={() => navigate(t.to)}
            aria-current={active ? 'page' : undefined}
            aria-label={t.label}
            className="relative h-[46px] rounded-full flex items-center gap-1.5 px-3.5"
          >
            {active && (
              <motion.span
                layoutId="parent-tab-pill"
                transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                className="absolute inset-0 rounded-full bg-white/90 dark:bg-white/[0.14] shadow-[0_2px_8px_rgb(26_46_74/0.12),inset_0_1px_0_#fff] dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]"
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <t.Glyph strokeWidth={2.2} aria-hidden className={`w-[22px] h-[22px] ${active ? 'text-ninja-blue-ink' : 'text-ninja-navy opacity-55'}`} />
              {active && <span className="font-ninja font-extrabold text-[13px] text-ninja-blue-ink pr-1">{t.label}</span>}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// `bleed`: the page opens with a full-bleed hero on a phone, so the bar
// stays out of its way below lg and the hero's own back chip is the way out.
export default function ParentLayout({ children, switcher = null, bleed = false }) {
  const { parent, logout } = useParentAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [bugOpen, setBugOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login?tab=parent');
  };

  return (
    // overflow-x-clip: the home banner is w-screen inside the centered main
    // column, which overhangs by half a scrollbar each side. Clip, not hidden:
    // hidden would make this the scrollport and break sticky descendants.
    <div className="min-h-[100dvh] bg-ninja-bg overflow-x-clip">
      {/* Liquid glass filter for the phone capsule. Chromium refracts; iOS
          Safari falls back to blur. Same filter the staff shell defines. */}
      <svg aria-hidden="true" className="absolute w-0 h-0 pointer-events-none" focusable="false">
        <filter id="liquidGlass" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.014" numOctaves="2" seed="17" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="2.2" result="softNoise" />
          <feDisplacementMap in="SourceGraphic" in2="softNoise" scale="22" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      {/* One flat bar. Full width, white, a hairline under it, nothing floating. */}
      <header className={`bg-white border-b border-ninja-border ${bleed ? 'hidden lg:block' : ''}`}>
        <div className="max-w-6xl mx-auto h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Logo variant="lockup" className="h-8 text-ninja-navy" />
            <span className="text-ninja-muted font-ninja text-[13px] v2 hidden sm:inline">Parent Portal</span>
          </div>

          <div className="hidden lg:flex items-center gap-1 p-1 rounded-xl bg-ninja-bg border border-ninja-border">
            {TABS.map((t) => {
              const active = isActive(pathname, t.to);
              return (
                <NavLink key={t.to} to={t.to}
                  className={`px-4 py-1.5 rounded-lg font-ninja text-[13px] font-extrabold transition-colors ${active ? 'bg-white dark:bg-white/[0.12] text-ninja-navy shadow-sm' : 'text-ninja-muted hover:text-ninja-navy'}`}>
                  {t.label}
                </NavLink>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:block">{switcher}</div>
            {parent?.centerName && <span className="text-ninja-muted font-ninja text-[13px] v2 hidden xl:inline">{parent.centerName}</span>}
            <ThemeToggle />
            <button onClick={handleLogout} className="text-ninja-muted hover:text-ninja-red font-ninja text-[13px] font-bold transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 lg:pt-7 pb-32 lg:pb-12">
        {children}
      </main>

      <ParentTabBar />

      <button
        onClick={() => setBugOpen(true)}
        title="Report a bug or suggest a feature"
        aria-label="Report a bug or suggest a feature"
        className="hidden lg:flex fixed bottom-6 right-6 z-40 bg-white border border-ninja-border text-ninja-muted hover:text-ninja-red shadow-lg rounded-full w-9 h-9 items-center justify-center transition-all hover:shadow-xl"
      >
        <RocketIcon className="w-4 h-4" />
      </button>
      <BugReportButton open={bugOpen} onClose={() => setBugOpen(false)} reporter={{ name: parent?.parentName, role: 'parent' }} />
    </div>
  );
}
