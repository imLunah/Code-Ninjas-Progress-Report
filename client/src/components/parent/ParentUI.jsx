import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckIcon, ChevronRightIcon, StarIcon } from 'lucide-react';
import { FLAT } from '../../lib/surfaces';
import { BELTS, PROGRAM_LOGOS, PROGRAM_BANNERS } from '../../utils/beltConfig';
import { PROGRAM_GRADIENTS } from '../../lib/programTheme';
import BeltIcon from '../ui/BeltIcon';

// The parent portal's small vocabulary, in one file so the pages read the same.
//
// The page is flat and the softness lives inside the cards: a white card with
// a hairline (FLAT), a hero in the program's own colour or art, tinted lists,
// and grouped rows with hairline separators. Program identity is pinned —
// CREATE and Robotics blue, JR purple — and never follows the theme accent.
// Secondary text is heavier rather than lighter, so it stays legible on a tint.

// Large title with a small line above it. On a phone it is the page's header;
// on desktop it is the title row, with the switcher beside it.
export function PageTitle({ eyebrow, title, right, className = '' }) {
  return (
    <div className={`flex items-end justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        {eyebrow && <p className="text-ninja-muted font-ninja text-[13px] v2 truncate">{eyebrow}</p>}
        <h1 className="text-ninja-navy font-ninja font-extrabold text-[30px] sm:text-[34px] leading-[1.05] tracking-[-0.025em] truncate">{title}</h1>
      </div>
      {right && <div className="flex-shrink-0 pb-1">{right}</div>}
    </div>
  );
}

// The banner. A program's own art where it has some (Robotics, AI), else the
// program's pinned gradient. `size` 'card' sits inside a course or child card;
// 'page' is the top of a course opened on its own.
//
// Everything on a hero is white: the art is dark by construction (banners are
// overlaid, gradients are deep), so nothing here reads the belt colour to
// choose an ink.
export function Hero({ program, size = 'card', className = '', style = {}, children }) {
  const banner = PROGRAM_BANNERS[program];
  const gradient = PROGRAM_GRADIENTS[program] || PROGRAM_GRADIENTS.CREATE;
  const background = banner
    ? `linear-gradient(90deg, rgb(6 13 26 / 0.72) 0%, rgb(6 13 26 / 0.45) 55%, rgb(6 13 26 / 0.25) 100%), url(${banner}) center / cover no-repeat`
    : gradient;
  // A page hero on a phone is the top of the screen: it runs edge to edge
  // from under the status bar, and only its bottom corners are rounded. On
  // desktop it is a card in the right column like everything else.
  const pad = size === 'page'
    ? '-mx-4 sm:-mx-6 -mt-5 rounded-t-none rounded-b-[34px] px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-6 lg:mx-0 lg:mt-0 lg:rounded-[26px] lg:px-7 lg:pt-7 lg:pb-6'
    : 'p-4 rounded-[18px]';
  return (
    <div className={`relative overflow-hidden text-white ${pad} ${className}`} style={{ background, ...style }}>
      {children}
    </div>
  );
}

// The badge on the right of a hero: the belt for CREATE, the program's logo
// for everything else. Both sit on the banner as they are, no disc and no
// ring: the art is the emblem.
export function Emblem({ program, belt, size = 64 }) {
  if (program === 'CREATE' && belt) {
    return <BeltIcon belt={belt} size={size} className="flex-shrink-0" />;
  }
  const logo = PROGRAM_LOGOS[program];
  if (!logo) return null;
  return <img src={logo} alt="" className="object-contain flex-shrink-0 drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)]" style={{ width: size, height: size }} />;
}

// The 40px program logo that leads a card header.
export function ProgramMark({ program, size = 40 }) {
  const logo = PROGRAM_LOGOS[program];
  return (
    <span className="inline-flex items-center justify-center rounded-[12px] flex-shrink-0 bg-ninja-bg border border-ninja-border" style={{ width: size, height: size }}>
      {logo ? <img src={logo} alt="" className="object-contain" style={{ width: size - 10, height: size - 10 }} /> : <span className="font-ninja font-black text-ninja-navy text-sm">{String(program || '?')[0]}</span>}
    </span>
  );
}

// The belt road: all thirteen belts in a row, the current one lit, the ones
// behind full, the ones ahead dimmed. `onHero` draws its labels and
// connectors in white for use on a blue banner; otherwise navy on white.
// Scrolls sideways where thirteen do not fit.
export function BeltRoad({ current, onHero = false, compact = false, className = '' }) {
  const idx = BELTS.findIndex((b) => b.name === current);
  const icon = compact ? 22 : 26;
  const cur = compact ? 30 : 34;
  const line = onHero ? 'rgb(255 255 255 / 0.35)' : 'rgb(var(--ninja-navy) / 0.15)';
  const scroller = useRef(null);
  // Where the road is wider than its box, start it with the current belt in
  // view rather than always at White. Sets scrollLeft directly so the page
  // itself does not move.
  useEffect(() => {
    const el = scroller.current;
    if (!el || idx < 0) return;
    const col = compact ? 40 : 46;
    const centre = idx * col + col / 2;
    el.scrollLeft = Math.max(0, centre - el.clientWidth / 2);
  }, [idx, compact]);
  return (
    <div ref={scroller} className={`overflow-x-auto no-scrollbar -mx-1 px-1 ${className}`} aria-label="Belt road" role="img">
      <div className="flex items-start" style={{ minWidth: 'max-content' }}>
        {BELTS.map((b, i) => {
          const state = idx < 0 ? 'ahead' : i < idx ? 'earned' : i === idx ? 'current' : 'ahead';
          const size = state === 'current' ? cur : icon;
          return (
            <div key={b.name} className="flex items-start">
              <div className="flex flex-col items-center" style={{ width: compact ? 40 : 46 }}>
                <span className="flex items-center justify-center" style={{ height: cur }}>
                  <BeltIcon belt={b.name} size={size} dimmed={state === 'ahead'}
                    style={state === 'current' ? { borderRadius: 999, boxShadow: `0 0 0 2px ${onHero ? 'rgb(255 255 255 / 0.9)' : '#fff'}, 0 0 0 4px ${b.color}` } : undefined} />
                </span>
                <span className={`font-ninja mt-1 leading-none ${compact ? 'text-[9px]' : 'text-[10px]'} ${state === 'current' ? 'font-extrabold' : 'font-bold'} ${onHero ? (state === 'ahead' ? 'text-white/45' : 'text-white') : (state === 'ahead' ? 'text-ninja-muted/60' : 'text-ninja-navy')}`}>
                  {b.name}
                </span>
              </div>
              {i < BELTS.length - 1 && (
                <span aria-hidden className="block flex-shrink-0" style={{ width: compact ? 6 : 8, height: 2, background: line, marginTop: cur / 2 - 1, marginLeft: -3, marginRight: -3 }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Level pills (and kit pills, via `label`). `states` is levelStates() from parentProgress: done levels
// carry a check, the current one is solid, the ones ahead are quiet. On a
// hero the solid pill is white; on a card it is the CREATE blue. The solid
// fill slides between pills rather than blinking, so the eye follows the
// choice. `layoutId` must be unique per instance on screen.
export function LevelPills({ states, value, onChange, onHero = false, layoutId = 'level-pill', className = '' }) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`} role="tablist" aria-label="Levels">
      {states.map((s) => {
        const selected = s.level === value;
        const ink = onHero
          ? (selected ? 'text-[#0c3d99]' : s.state === 'done' ? 'text-white' : 'text-white/80')
          : (selected ? 'text-white' : s.state === 'done' ? 'text-ninja-navy' : 'text-ninja-muted');
        const rest = onHero
          ? (s.state === 'done' ? 'bg-white/30 border border-white/40' : 'bg-white/15 border border-white/25')
          : 'bg-ninja-bg border border-ninja-border';
        return (
          <button key={s.level} type="button" role="tab" aria-selected={selected} onClick={() => onChange?.(s.level)}
            className={`relative inline-flex items-center justify-center gap-1 h-9 min-w-[44px] px-3.5 rounded-[12px] font-ninja font-extrabold text-[13px] transition-colors duration-150 active:scale-95 ${selected ? '' : rest} ${ink}`}>
            {selected && (
              <motion.span layoutId={layoutId} transition={{ type: 'spring', stiffness: 480, damping: 36 }} aria-hidden
                className={`absolute inset-0 rounded-[12px] ${onHero ? '' : 'bg-ninja-blue'}`}
                // Inline on the hero: `.dark .bg-white` would turn the pill dark on the blue.
                style={onHero ? { background: '#ffffff' } : undefined} />
            )}
            <span className="relative z-10 inline-flex items-center gap-1">
              {s.state === 'done' && <CheckIcon size={12} strokeWidth={3.2} aria-hidden />}
              {s.label ?? s.level}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// A grouped list. Optional eyebrow title and an action on the right. `tint`
// makes it a tinted card ('green', 'blue', 'lilac', 'amber') whose rows sit
// on a white inset.
export function Group({ title, action, tint, children, className = '' }) {
  return (
    <section className={`${tint ? `tint-${tint} rounded-[22px]` : FLAT} overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="flex items-baseline justify-between px-4 pt-3.5 pb-1">
          {title && <p className={`font-ninja text-[11px] font-extrabold uppercase tracking-[0.08em] ${tint ? '' : 'text-ninja-muted'}`} style={tint ? { color: 'var(--tint-ink)' } : undefined}>{title}</p>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

// One row of a Group. `lead` is a small square or dot on the left; `to` or
// `onClick` makes the row a link with a chevron.
export function Row({ lead, title, subtitle, trailing, to, onClick, dim = false, first = false, inset = false, active = false }) {
  const inner = (
    <>
      {lead && <span className="flex-shrink-0">{lead}</span>}
      <span className="min-w-0 flex-1">
        <span className={`block font-ninja font-extrabold text-[15px] truncate ${dim ? 'text-ninja-navy/60' : 'text-ninja-navy'}`}>{title}</span>
        {subtitle && <span className="block font-ninja text-[12.5px] text-ninja-muted v2 truncate">{subtitle}</span>}
      </span>
      {trailing}
      {(to || onClick) && <ChevronRightIcon size={16} className="text-ninja-muted/60 flex-shrink-0" aria-hidden />}
    </>
  );
  const cls = `flex items-center gap-3 px-4 py-3 ${first ? '' : 'border-t border-ninja-navy/[0.08]'} ${inset ? 'tint-inset' : ''} ${active ? 'bg-ninja-blue/[0.06]' : ''} ${to || onClick ? 'hover:bg-ninja-navy/[0.03] active:bg-ninja-navy/[0.06] transition-colors' : ''}`;
  if (to) return <Link to={to} className={cls}>{inner}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={`${cls} w-full text-left`}>{inner}</button>;
  return <div className={cls}>{inner}</div>;
}

// The little square that leads a row: a number, an initial, a glyph.
export function Tile({ children, tint = 'rgb(var(--ninja-blue) / 0.12)', color, size = 30 }) {
  return (
    <span className="inline-flex items-center justify-center rounded-[9px] font-ninja font-extrabold text-[13px]"
      style={{ width: size, height: size, background: tint, color: color || 'rgb(var(--ninja-blue-ink))' }}>
      {children}
    </span>
  );
}

// The bullet on a project row: done, working on it, not yet, or the
// Adventure's star.
export function StatusDot({ status, adventure = false }) {
  if (status === 'done') {
    return <span className="w-[26px] h-[26px] rounded-full bg-green-500 inline-flex items-center justify-center"><CheckIcon size={13} className="text-white" strokeWidth={3.2} aria-hidden /></span>;
  }
  if (status === 'working') {
    return <span className="w-[26px] h-[26px] rounded-full border-[2.5px] border-ninja-blue inline-flex items-center justify-center"><span className="w-2.5 h-2.5 rounded-full bg-ninja-blue" /></span>;
  }
  if (adventure) {
    return <span className="w-[26px] h-[26px] rounded-full border-2 border-ninja-navy/20 inline-flex items-center justify-center"><StarIcon size={12} className="text-ninja-navy/40" aria-hidden /></span>;
  }
  return <span className="w-[26px] h-[26px] rounded-full border-2 border-ninja-navy/20 inline-block" />;
}

// The status word at the end of a row.
export function StatusText({ status }) {
  const map = {
    done: ['Completed', '#15803d'],
    Completed: ['Completed', '#15803d'],
    working: ['Working on', 'rgb(var(--ninja-blue-ink))'],
    'Working On': ['Working on', 'rgb(var(--ninja-blue-ink))'],
    Started: ['Started', 'rgb(var(--ninja-blue-ink))'],
    club: ['Club', '#7e22ce'],
  };
  const [text, color] = map[status] || [status, 'rgb(var(--ninja-muted))'];
  return <span className="font-ninja text-[12px] font-extrabold flex-shrink-0" style={{ color }}>{text}</span>;
}

// A quiet link with a chevron: "Full profile ›", "All 24 sessions ›".
export function MoreLink({ to, children, className = '' }) {
  return (
    <Link to={to} className={`inline-flex items-center gap-0.5 font-ninja text-[13px] font-extrabold text-ninja-blue-ink hover:underline ${className}`}>
      {children}
      <ChevronRightIcon size={15} strokeWidth={2.6} aria-hidden />
    </Link>
  );
}

// A round back button for the top of a page hero.
export function BackChip({ to, label = 'Back' }) {
  return (
    <Link to={to} aria-label={label}
      className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/20 border border-white/35 text-white">
      <ChevronRightIcon size={18} strokeWidth={2.6} className="rotate-180" aria-hidden />
    </Link>
  );
}
