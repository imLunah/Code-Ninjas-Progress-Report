import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HomeIcon, BookOpenIcon, UserRoundIcon, LogOutIcon, ChevronLeftIcon } from 'lucide-react';
import { useParentAuth } from '../../context/ParentAuthContext';
import { useParentPortal } from '../../context/ParentPortalContext';
import { useLightOnly } from '../../context/ThemeContext';
import Logo from '../ui/Logo';
import Segmented from '../ui/Segmented';
import BugReportButton from '../ui/BugReportButton';
import { RocketIcon } from '../ui/icons';

// The parent portal's shell.
//
// A flat page. On desktop a white side nav runs down the left edge with a
// hairline beside it: the logo on top, the sections under it, the child
// switcher, and the account at the bottom. It collapses to an icon rail the
// same way the staff sidebar does, remembered per browser. On a phone the bar across the top
// is just the logo and the account, the pages carry their own large titles,
// and the sections live in a floating capsule at the bottom, the same
// material as the staff nav.
//
// `main` is a size container (container-type: inline-size) so the home
// banner can span the content region exactly with 100cqw — w-screen would
// run under the side nav. Nothing inside main is position: fixed, which the
// containment would re-anchor to main.
//
// Light only: the boot script in index.html skips the dark class under
// /parent and useLightOnly holds it off while the shell is mounted.

// Same widths as the staff Sidebar, so the two shells collapse to the same rail.
const EXPANDED_W = 240; // matches w-60
const COLLAPSED_W = 76;

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

function ParentSideNav({ switcher, parentName, centerName, onLogout, onReport }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const tabs = useParentTabs();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('parent-nav-collapsed') === '1');
  const toggleCollapsed = () => {
    setCollapsed((c) => {
      localStorage.setItem('parent-nav-collapsed', c ? '0' : '1');
      return !c;
    });
  };

  // Parents have no profile picture, so the account row carries their
  // initials instead: first letter of the first and last name.
  const initials = (parentName || '').trim().split(/\s+/).filter(Boolean).map((w) => w[0]).filter((_, i, a) => i === 0 || i === a.length - 1).join('').toUpperCase() || 'P';
  const avatar = (
    <div className="w-8 h-8 rounded-full bg-ninja-blue flex items-center justify-center text-white font-ninja font-bold text-xs flex-shrink-0" aria-hidden>
      {initials}
    </div>
  );

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? COLLAPSED_W : EXPANDED_W }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      className="hidden lg:flex flex-col shrink-0 sticky top-0 h-screen bg-white border-r border-ninja-border z-40"
    >
      {/* Collapse toggle, floating on the nav's edge like the staff sidebar's. */}
      <button
        type="button"
        onClick={toggleCollapsed}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute -right-3 top-[72px] z-50 w-6 h-6 rounded-full bg-white border border-ninja-border shadow-sm flex items-center justify-center text-ninja-muted hover:text-ninja-blue hover:border-ninja-blue/50 transition-colors"
      >
        <motion.span
          animate={{ rotate: collapsed ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className="flex"
        >
          <ChevronLeftIcon strokeWidth={2.5} aria-hidden className="w-3.5 h-3.5" />
        </motion.span>
      </button>

      <div className={`py-5 border-b border-ninja-border overflow-hidden ${collapsed ? 'px-2 flex justify-center' : 'px-5'}`}>
        {collapsed ? (
          <Logo variant="mark" className="h-9 text-ninja-navy" />
        ) : (
          <>
            <Logo variant="lockup" className="h-8 text-ninja-navy" />
            <p className="mt-1.5 font-ninja text-[12px] v2 text-ninja-muted whitespace-nowrap">Parent Portal</p>
          </>
        )}
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
              title={collapsed ? t.label : undefined}
              aria-label={collapsed ? t.label : undefined}
              className={`w-full flex items-center gap-3 py-2.5 rounded-xl font-ninja font-bold text-sm transition-colors whitespace-nowrap overflow-hidden ${
                collapsed ? 'px-0 justify-center' : 'px-3'
              } ${
                active ? 'bg-ninja-blue/10 text-ninja-blue-ink' : 'text-ninja-muted hover:text-ninja-navy hover:bg-ninja-bg'
              }`}
            >
              <t.Glyph strokeWidth={2.1} aria-hidden className="w-5 h-5 flex-shrink-0" />
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15, delay: 0.08 }}>
                  {t.label}
                </motion.span>
              )}
            </button>
          );
        })}
      </nav>

      {/* empty:hidden — ChildSwitcher renders nothing for a one-child family,
          and this block should take its border and padding with it. The rail
          is too narrow for a segmented control, so it goes with the labels. */}
      {!collapsed && <div className="px-4 py-3 border-t border-ninja-border empty:hidden">{switcher}</div>}

      <div className="mt-auto">
        {/* The account row, same shape as the staff sidebar's: the parent's
            initials, their name over their center, and the report + sign
            out glyphs. On the rail the glyphs stack under the initials. */}
        <div className="p-3 border-t border-ninja-border">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2 py-1" title={parentName || 'Parent'}>
              {avatar}
              <button
                onClick={onReport}
                title="Report a bug or suggest a feature"
                aria-label="Report a bug or suggest a feature"
                className="text-ninja-muted hover:text-ninja-red transition-colors p-1"
              >
                <RocketIcon className="w-4 h-4" />
              </button>
              <button
                onClick={onLogout}
                title="Sign out"
                aria-label="Sign out"
                className="text-ninja-muted hover:text-ninja-red transition-colors p-1"
              >
                <LogOutIcon className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 px-2 py-2">
              {avatar}
              <div className="flex-1 min-w-0">
                <p className="font-ninja font-bold text-ninja-navy text-sm truncate">{parentName || 'Parent'}</p>
                {centerName && <p className="font-ninja text-ninja-muted text-xs truncate">{centerName}</p>}
              </div>
              <button
                onClick={onReport}
                title="Report a bug or suggest a feature"
                aria-label="Report a bug or suggest a feature"
                className="text-ninja-muted hover:text-ninja-red transition-colors flex-shrink-0 p-1"
              >
                <RocketIcon className="w-4 h-4" />
              </button>
              <button
                onClick={onLogout}
                title="Sign out"
                aria-label="Sign out"
                className="text-ninja-muted hover:text-ninja-red transition-colors flex-shrink-0 p-1"
              >
                <LogOutIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.aside>
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
  // The parent portal is light only; there is no theme toggle here and the
  // shell holds the page light while it is up.
  useLightOnly();

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

      <ParentSideNav
        switcher={switcher}
        parentName={parent?.parentName}
        centerName={parent?.centerName}
        onLogout={handleLogout}
        onReport={() => setBugOpen(true)}
      />

      {/* The phone's flat top bar: the logo and the account, nothing else. */}
      <header className={`bg-white border-b border-ninja-border ${bleed ? 'hidden' : 'lg:hidden'}`}>
        <div className="h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Logo variant="lockup" className="h-8 text-ninja-navy" />
            <span className="text-ninja-muted font-ninja text-[13px] v2 hidden sm:inline">Parent Portal</span>
          </div>
          <div className="flex items-center gap-3">
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

      <BugReportButton open={bugOpen} onClose={() => setBugOpen(false)} reporter={{ name: parent?.parentName, role: 'parent' }} />
    </div>
  );
}
