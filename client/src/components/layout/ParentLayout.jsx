import { useEffect, useLayoutEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import { HomeIcon, CalendarDaysIcon, LogOutIcon, ChevronLeftIcon } from 'lucide-react';
import { useParentAuth } from '../../context/ParentAuthContext';
import { useLightOnly } from '../../context/ThemeContext';
import Logo from '../ui/Logo';
import BugReportButton from '../ui/BugReportButton';
import { RocketIcon } from '../ui/icons';

// The parent portal's shell.
//
// A flat page. On desktop a white side nav runs down the left edge with a
// hairline beside it: the logo on top, the sections under it, the child
// and the account at the bottom. It collapses to an icon rail the
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

// Home, and what the center has coming up. Courses was a section once and it
// is gone: its grid was a menu of the programs the profile already lists, and
// a course now opens from the card that describes it.
//
// Profile was a section too, and it is gone for a related reason. It was not
// one place — it was whichever child the switcher happened to be pointing at,
// which is why it needed the portal context to work out where it went. Home
// draws a card per ninja with the way into each one on it, so the nav was
// offering a second, ambiguous door to a room the page in front of you
// already opens. Events took the slot: it IS one place, the same for every
// family at the center, and until now the only way to see what was on was to
// wait for the home billboard to rotate around to it.
const TABS = [
  { to: '/parent/dashboard', label: 'Home', Glyph: HomeIcon },
  { to: '/parent/events', label: 'Events', Glyph: CalendarDaysIcon },
];

// Same look as MobileNav: near-transparent capsule, refracting where the browser can.
export const GLASS = 'border border-white/30 dark:border-white/12 bg-white/[0.55] dark:bg-[#0c0f1a]/55 backdrop-blur-xl backdrop-saturate-[1.9] shadow-[0_14px_40px_rgb(26_46_74/0.18)] dark:shadow-[0_14px_40px_rgb(0_0_0/0.45)]';
export const REFRACT = { backdropFilter: 'url(#liquidGlass) blur(22px) saturate(1.8)', WebkitBackdropFilter: 'blur(22px) saturate(1.8)' };
// The displacement map behind #glassRim, as an image the filter can read.
const LENS_MAP = "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='2' height='2' preserveAspectRatio='none'%3E%3ClinearGradient id='g' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0' stop-color='rgb(0,128,128)'/%3E%3Cstop offset='0.74' stop-color='rgb(0,128,128)'/%3E%3Cstop offset='1' stop-color='rgb(128,128,128)'/%3E%3C/linearGradient%3E%3Crect width='2' height='2' fill='url(%23g)'/%3E%3C/svg%3E";

// One spring for both navs, so the rail's pill and the phone bar's pill are
// recognisably the same movement at two sizes.
const PILL_SPRING = { type: 'spring', stiffness: 480, damping: 36 };

function isActive(pathname, to) {
  return pathname === to || pathname.startsWith(to + '/');
}

// First letter of the first and last name. "P" until there is a name.
function initialsOf(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  return parts.filter((_, i) => i === 0 || i === parts.length - 1).map((w) => w[0]).join('').toUpperCase() || 'P';
}

function ParentSideNav({ parentName, centerName, onLogout, onReport }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('parent-nav-collapsed') === '1');
  const toggleCollapsed = () => {
    setCollapsed((c) => {
      localStorage.setItem('parent-nav-collapsed', c ? '0' : '1');
      return !c;
    });
  };

  // Parents have no profile picture, so the account row carries their
  // initials instead.
  const initials = initialsOf(parentName);
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
        {TABS.map((t) => {
          const active = isActive(pathname, t.match || t.to);
          return (
            <button
              key={t.label}
              type="button"
              onClick={() => navigate(t.to)}
              aria-current={active ? 'page' : undefined}
              title={collapsed ? t.label : undefined}
              aria-label={collapsed ? t.label : undefined}
              className={`relative w-full flex items-center gap-3 py-2.5 rounded-xl font-ninja font-bold text-sm transition-colors whitespace-nowrap overflow-hidden ${
                collapsed ? 'px-0 justify-center' : 'px-3'
              } ${
                active ? 'text-ninja-blue-ink' : 'text-ninja-muted hover:text-ninja-navy hover:bg-ninja-bg'
              }`}
            >
              {/* THE SAME TINT, ON A PILL THAT TRAVELS. It was a class that
                  appeared on one row and vanished from another, so moving
                  between sections was a cut. One `layoutId` makes the two
                  states the same object: framer measures where it was and
                  where it now is and springs it between them, so the blue
                  slides from Home to Events and the section you chose is
                  somewhere it came FROM rather than somewhere that blinked
                  on. The phone bar has worked this way since it was built;
                  this is the rail catching up.

                  Still a background tint and an ink colour, which is the
                  house rule for an active nav row. No left-edge bar. */}
              {active && (
                <motion.span
                  layoutId="parent-rail-pill"
                  transition={PILL_SPRING}
                  className="absolute inset-0 rounded-xl bg-ninja-blue/10"
                />
              )}
              <t.Glyph strokeWidth={2.1} aria-hidden className="relative z-10 w-5 h-5 flex-shrink-0" />
              {!collapsed && (
                <motion.span className="relative z-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15, delay: 0.08 }}>
                  {t.label}
                </motion.span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto">
        {/* The account row, same shape as the staff sidebar's: the parent's
            initials, their name over their center, and the report + sign
            out glyphs. The initials and name open Settings. The rail keeps
            only the initials; report and sign out live in Settings. */}
        <div className="p-3 border-t border-ninja-border">
          {collapsed ? (
            <div className="flex flex-col items-center py-1">
              <button
                type="button"
                onClick={() => navigate('/parent/account')}
                title="Settings"
                aria-label="Settings"
                aria-current={isActive(pathname, '/parent/account') ? 'page' : undefined}
                className="rounded-full hover:opacity-80 transition-opacity"
              >
                {avatar}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 px-2 py-2">
              <button
                type="button"
                onClick={() => navigate('/parent/account')}
                title="Settings"
                aria-current={isActive(pathname, '/parent/account') ? 'page' : undefined}
                className="flex items-center gap-2.5 flex-1 min-w-0 text-left rounded-xl hover:opacity-80 transition-opacity"
              >
                {avatar}
                <span className="flex-1 min-w-0">
                  <span className="block font-ninja font-bold text-ninja-navy text-sm truncate">{parentName || 'Parent'}</span>
                  {centerName && <span className="block font-ninja text-ninja-muted text-xs truncate">{centerName}</span>}
                </span>
              </button>
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
  const { parent } = useParentAuth();
  const accountActive = isActive(pathname, '/parent/account');
  return (
    <nav
      aria-label="Parent portal"
      className={`lg:hidden fixed left-1/2 -translate-x-1/2 bottom-[max(1.1rem,env(safe-area-inset-bottom))] z-40 flex items-center gap-0.5 p-1.5 rounded-full ${GLASS}`}
      style={REFRACT}
    >
      {TABS.map((t) => {
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
                transition={PILL_SPRING}
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
      {/* The account rides the bar as the initials bubble, same pill as the
          tabs; Settings is where sign out and the rest live. */}
      <button
        type="button"
        onClick={() => navigate('/parent/account')}
        aria-current={accountActive ? 'page' : undefined}
        aria-label="Settings"
        className="relative h-[46px] rounded-full flex items-center gap-1.5 px-2.5"
      >
        {accountActive && (
          <motion.span
            layoutId="parent-tab-pill"
            transition={PILL_SPRING}
            className="absolute inset-0 rounded-full bg-white/90 dark:bg-white/[0.14] shadow-[0_2px_8px_rgb(26_46_74/0.12),inset_0_1px_0_#fff] dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]"
          />
        )}
        <span className="relative z-10 flex items-center gap-1.5">
          <span className={`w-7 h-7 rounded-full bg-ninja-blue flex items-center justify-center text-white font-ninja font-bold text-[10px] ${accountActive ? '' : 'opacity-80'}`} aria-hidden>
            {initialsOf(parent?.parentName)}
          </span>
          {accountActive && <span className="font-ninja font-extrabold text-[13px] text-ninja-blue-ink pr-1">Account</span>}
        </span>
      </button>
    </nav>
  );
}

// `bleed`: the page opens with a full-bleed hero on a phone, so the top bar
// stays out of its way below lg and the hero's own back chip is the way out.
// Every parent page opens at its banner.
//
// Nothing in this app reset the scroll on a route change, and React Router
// does not do it for you. On the parent portal that is worse than landing
// part way down a page, because the banner is pinned: at any offset the hero
// stays at the top of the screen but SHIFTED UP and DIMMED, with the sheet
// riding over its bottom edge and cutting the kit pills in half. It reads as
// a rendering fault rather than as a scroll position, which is exactly how it
// was reported.
//
// It has to key on the pathname rather than on mount. `/parent/students/:id`
// and `/parent/students/:id/courses/:program` render the SAME component at
// the same position in the tree, so opening a course from a profile does not
// remount anything and there is no mount for an effect to hang on.
//
// `scrollRestoration = 'manual'` is part of the fix and not tidiness: on a
// back or forward the browser restores the old offset AFTER the effect runs
// and puts the page straight back where it was. It is set while the portal is
// mounted and handed back on the way out, so the staff side keeps the
// browser's own behaviour.
//
// It returns the animation controls for the page, because the reset and the
// entrance are the same moment and have to happen in the same layout effect:
// the page has to be BOTH at the top and at zero opacity before the browser
// paints it, or the transition plays over a frame of the new page already
// sitting there at full strength.
function useTopOnNavigate() {
  const { pathname } = useLocation();
  const page = useAnimationControls();
  const still = useReducedMotion();

  useEffect(() => {
    const previous = window.history.scrollRestoration;
    if (!previous) return undefined;
    window.history.scrollRestoration = 'manual';
    return () => { window.history.scrollRestoration = previous; };
  }, []);

  // Layout effect, so the page is never painted at the old offset first.
  //
  // THE ENTRANCE. Moving between sections used to be a cut: one page was
  // gone and the next was there, with no frame in between saying they were
  // different pages rather than one page redrawing. It rises a few pixels
  // into place instead, which is short enough to be over before it is a wait
  // and long enough to read as an arrival.
  //
  // Only the incoming page animates. There is no exit, on purpose: an exit
  // means both pages are mounted at once, which doubles the document height
  // for the length of the animation and moves the scrollbar under the hand
  // of somebody who is already scrolling.
  //
  // The `y` has to land back at exactly zero. A lingering transform on this
  // wrapper would be a containing block around the pinned banners, and a
  // banner that cannot pin is the bug this same hook was written to fix.
  // framer writes `transform: none` once every value is at its default, so
  // it does, and there is a test for it below.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    if (still) return;
    page.set({ opacity: 0, y: 10 });
    page.start({ opacity: 1, y: 0, transition: { duration: 0.34, ease: [0.23, 1, 0.32, 1] } });
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return page;
}

export default function ParentLayout({ children, bleed = false }) {
  const { parent, logout } = useParentAuth();
  const navigate = useNavigate();
  const [bugOpen, setBugOpen] = useState(false);
  const page = useTopOnNavigate();
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
        {/* The lens for the page sheet's glass rim. Not turbulence: a rim is
            a smooth bend, not a ripple. The map is a vertical gradient, held
            at full strength down to the 74% line and easing to nothing at the
            bottom; on the rim element that line is where the straight run of
            the band begins (lip over lip-plus-rim, 40/54 and 34/46 both land
            there), so the bend is strongest along the band's top edge and
            gone by the time it has dissolved into paper. Red carries the bend
            (0 = pull from above), blue is pinned at 128 so nothing moves
            sideways. iOS Safari cannot run an SVG filter in a backdrop and
            falls back to the blur and saturation alone. */}
        <filter id="glassRim" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feImage href={LENS_MAP} preserveAspectRatio="none" result="lens" />
          <feDisplacementMap in="SourceGraphic" in2="lens" scale="20" xChannelSelector="B" yChannelSelector="R" />
        </filter>
      </svg>

      <ParentSideNav
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
        </div>
      </header>

      <main className="flex-1 min-w-0 pt-5 lg:pt-7 pb-32 lg:pb-12 [container-type:inline-size]">
        <motion.div className="max-w-6xl mx-auto px-4 sm:px-6" animate={page}>
          {children}
        </motion.div>
      </main>

      <ParentTabBar />

      <BugReportButton open={bugOpen} onClose={() => setBugOpen(false)} reporter={{ name: parent?.parentName, role: 'parent' }} />
    </div>
  );
}
