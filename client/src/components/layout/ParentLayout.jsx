import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageSquareTextIcon } from 'lucide-react';
import { useParentAuth } from '../../context/ParentAuthContext';
import { useParentPortal } from '../../context/ParentPortalContext';
import ThemeToggle from '../ui/ThemeToggle';
import Logo from '../ui/Logo';
import Segmented from '../ui/Segmented';
import BugReportButton from '../ui/BugReportButton';
import { RocketIcon } from '../ui/icons';

// The parent portal's shell.
//
// Flat page. On a phone the pages carry their own large-title headers and the
// only chrome is a floating liquid-glass capsule at the bottom, the same
// material and the same flat-art icons as the staff nav. On desktop a floating
// toolbar carries the section switcher and the child switcher, and content
// runs underneath it. Glass is kept only for these two, because they float
// over content; a card on a flat page has nothing to bend.

const TABS = [
  { to: '/parent/dashboard', label: 'Home',    iconId: 'today' },
  { to: '/parent/courses',   label: 'Courses', iconId: 'report' },
  { to: '/parent/note',      label: 'Note',    Glyph: MessageSquareTextIcon },
];

// Same look as MobileNav: near-transparent capsule, refracting where the browser can.
const GLASS = 'border border-white/30 dark:border-white/12 bg-white/[0.55] dark:bg-[#0c0f1a]/55 backdrop-blur-xl backdrop-saturate-[1.9] shadow-[0_14px_40px_rgb(26_46_74/0.18)] dark:shadow-[0_14px_40px_rgb(0_0_0/0.45)]';
const REFRACT = { backdropFilter: 'url(#liquidGlass) blur(22px) saturate(1.8)', WebkitBackdropFilter: 'blur(22px) saturate(1.8)' };

function isActive(pathname, to) {
  return pathname === to || pathname.startsWith(to + '/');
}

function ParentTabBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return (
    <nav
      aria-label="Parent portal"
      className={`lg:hidden fixed left-1/2 -translate-x-1/2 bottom-[max(1.1rem,env(safe-area-inset-bottom))] z-40 flex items-center gap-0.5 p-1.5 rounded-full ${GLASS}`}
      style={REFRACT}
    >
      {TABS.map((t) => {
        const active = isActive(pathname, t.to);
        return (
          <button
            key={t.to}
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
              {t.Glyph ? (
                <t.Glyph strokeWidth={2.2} aria-hidden className={`w-[22px] h-[22px] ${active ? 'text-ninja-blue-ink' : 'text-ninja-navy opacity-55'}`} />
              ) : (
                <img src={`/icons/${t.iconId}.png`} alt="" className={`w-6 h-6 ${active ? 'drop-shadow-[0_1px_3px_rgba(0,0,0,0.25)]' : 'opacity-50 grayscale-[0.35]'}`} />
              )}
              {active && <span className="font-ninja font-extrabold text-[13px] text-ninja-blue-ink pr-1">{t.label}</span>}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// The child switcher: a segmented control when there are two or more, nothing
// when there is one, because a control with one option is a label.
export function ChildSwitcher({ size = 'sm', layoutId = 'parent-child' }) {
  const portal = useParentPortal();
  if (!portal?.students || portal.students.length < 2) return null;
  const options = portal.students.map((s) => ({ value: s.id, label: s.full_name.split(' ')[0] }));
  return (
    <Segmented
      options={options}
      value={portal.activeId}
      onChange={portal.setActiveId}
      label="Which ninja"
      layoutId={layoutId}
      size={size}
    />
  );
}

export default function ParentLayout({ children, wide = false }) {
  const { parent, logout } = useParentAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [bugOpen, setBugOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login?tab=parent');
  };

  return (
    <div className="min-h-[100dvh] bg-ninja-bg">
      {/* Liquid glass filter for the tab bar and toolbar. Chromium refracts;
          iOS Safari falls back to blur. Same filter the staff shell defines. */}
      <svg aria-hidden="true" className="absolute w-0 h-0 pointer-events-none" focusable="false">
        <filter id="liquidGlass" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.014" numOctaves="2" seed="17" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="2.2" result="softNoise" />
          <feDisplacementMap in="SourceGraphic" in2="softNoise" scale="22" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      {/* Desktop toolbar: floats, content passes under it. */}
      <div className="hidden lg:block sticky top-0 z-30 px-6 pt-4">
        <div className={`h-14 rounded-[18px] flex items-center justify-between px-4 ${GLASS}`} style={REFRACT}>
          <div className="flex items-center gap-3 min-w-0">
            <Logo variant="lockup" className="h-8 text-ninja-navy" />
            <span className="text-ninja-muted font-ninja text-[13px] v2">Parent Portal</span>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-ninja-bg/70 border border-ninja-border">
            {TABS.map((t) => {
              const active = isActive(pathname, t.to);
              return (
                <NavLink
                  key={t.to}
                  to={t.to}
                  className={`px-4 py-1.5 rounded-lg font-ninja text-[13px] font-extrabold transition-colors ${active ? 'bg-white dark:bg-white/[0.12] text-ninja-navy shadow-sm' : 'text-ninja-muted hover:text-ninja-navy'}`}
                >
                  {t.label}
                </NavLink>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            <ChildSwitcher size="sm" layoutId="parent-child-desktop" />
            {parent?.centerName && <span className="text-ninja-muted font-ninja text-[13px] v2 hidden xl:inline">{parent.centerName}</span>}
            <ThemeToggle />
            <button onClick={handleLogout} className="text-ninja-muted hover:text-ninja-red font-ninja text-[13px] font-bold transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </div>

      <main className={`${wide ? 'max-w-6xl' : 'max-w-3xl'} lg:max-w-6xl mx-auto px-4 sm:px-6 pt-4 lg:pt-6 pb-32 lg:pb-12`}>
        {children}
      </main>

      <ParentTabBar />

      <button
        onClick={() => setBugOpen(true)}
        title="Report a bug or suggest a feature"
        aria-label="Report a bug or suggest a feature"
        className="fixed top-4 right-4 lg:top-auto lg:bottom-6 lg:right-6 z-40 bg-white dark:bg-[#252c3e] border border-ninja-border text-ninja-muted hover:text-ninja-red shadow-lg rounded-full w-9 h-9 flex items-center justify-center transition-all hover:shadow-xl"
      >
        <RocketIcon className="w-4 h-4" />
      </button>
      <BugReportButton open={bugOpen} onClose={() => setBugOpen(false)} reporter={{ name: parent?.parentName, role: 'parent' }} />
    </div>
  );
}
