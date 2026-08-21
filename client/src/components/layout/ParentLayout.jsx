import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
// A flat page. On desktop a white side nav runs down the left edge with a
// hairline beside it: the logo on top, the sections under it, the child
// switcher, and the account at the bottom. On a phone the bar across the top
// is just the logo and the account, the pages carry their own large titles,
// and the sections live in a floating capsule at the bottom, the same
// material as the staff nav.
//
// `main` is a size container (container-type: inline-size) so the home
// banner can span the content region exactly with 100cqw — w-screen would
// run under the side nav. Nothing inside main is position: fixed, which the
// containment would re-anchor to main.

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

// Home, Courses, and the active child's profile — the same three sections as
// the phone capsule, built the same way.
function useParentTabs() {
  const { activeId } = useParentPortal();
  return [...TABS, { to: activeId ? `/parent/students/${activeId}` : '/parent/dashboard', match: '/parent/students', label: 'Profile', Glyph: UserRoundIcon }];
}

function ParentSideNav({ switcher, centerName, onLogout }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const tabs = useParentTabs();
  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 sticky top-0 h-screen bg-white border-r border-ninja-border z-40">
      <div className="px-5 py-5 border-b border-ninja-border">
        <Logo variant="lockup" className="h-8 text-ninja-navy" />
        <p className="mt-1.5 font-ninja text-[12px] v2 text-ninja-muted">Parent Portal</p>
      </div>

      <nav aria-label="Parent portal" className="p-3 mt-1 space-y-0.5">
        {tabs.map((t) => {
          const active = isActive(pathname, t.match || t.to);
          return (
            <button
              key={t.label}
              type="button"
              onClick={() => navigate(t.to)}
              aria-current={active ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-ninja font-bold text-sm transition-colors ${
                active ? 'bg-ninja-blue/10 text-ninja-blue-ink' : 'text-ninja-muted hover:text-ninja-navy hover:bg-ninja-bg'
              }`}
            >
              <t.Glyph strokeWidth={2.1} aria-hidden className="w-5 h-5 flex-shrink-0" />
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* empty:hidden — ChildSwitcher renders nothing for a one-child family,
          and this block should take its border and padding with it. */}
      <div className="px-4 py-3 border-t border-ninja-border empty:hidden">{switcher}</div>

      <div className="mt-auto border-t border-ninja-border">
        {centerName && <p className="px-5 pt-3 font-ninja text-[12px] v2 text-ninja-muted truncate">{centerName}</p>}
        <div className="px-5 py-2 flex items-center justify-between">
          <span className="font-ninja text-xs font-semibold text-ninja-muted">Appearance</span>
          <ThemeToggle />
        </div>
        <div className="px-5 pb-4">
          <button onClick={onLogout} className="font-ninja text-[13px] font-bold text-ninja-muted hover:text-ninja-red transition-colors">
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}

function ParentTabBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const tabs = useParentTabs();
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

// `bleed`: the page opens with a full-bleed hero on a phone, so the top bar
// stays out of its way below lg and the hero's own back chip is the way out.
export default function ParentLayout({ children, switcher = null, bleed = false }) {
  const { parent, logout } = useParentAuth();
  const navigate = useNavigate();
  const [bugOpen, setBugOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login?tab=parent');
  };

  return (
    <div className="min-h-[100dvh] bg-ninja-bg lg:flex">
      {/* Liquid glass filter for the phone capsule. Chromium refracts; iOS
          Safari falls back to blur. Same filter the staff shell defines. */}
      <svg aria-hidden="true" className="absolute w-0 h-0 pointer-events-none" focusable="false">
        <filter id="liquidGlass" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.014" numOctaves="2" seed="17" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="2.2" result="softNoise" />
          <feDisplacementMap in="SourceGraphic" in2="softNoise" scale="22" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      <ParentSideNav switcher={switcher} centerName={parent?.centerName} onLogout={handleLogout} />

      {/* The phone's flat top bar: the logo and the account, nothing else. */}
      <header className={`bg-white border-b border-ninja-border ${bleed ? 'hidden' : 'lg:hidden'}`}>
        <div className="h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Logo variant="lockup" className="h-8 text-ninja-navy" />
            <span className="text-ninja-muted font-ninja text-[13px] v2 hidden sm:inline">Parent Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button onClick={handleLogout} className="text-ninja-muted hover:text-ninja-red font-ninja text-[13px] font-bold transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 min-w-0 pt-5 lg:pt-7 pb-32 lg:pb-12 [container-type:inline-size]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {children}
        </div>
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
