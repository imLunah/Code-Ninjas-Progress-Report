import { Link } from 'react-router-dom';
import { ChevronRightIcon } from 'lucide-react';
import { CARD } from '../../lib/surfaces';

// The parent portal's small vocabulary, in one file so the pages read the same.
//
// The page is flat and the softness lives in the cards: white cards (CARD),
// tinted cards (.tint-* in index.css), and a hero whose material is the belt or
// program colour. Lists are grouped insets with hairline separators, the way a
// settings screen groups rows. Secondary text is heavier rather than lighter
// (vibrancy), so it stays legible on a tint.

// Large-title header for a phone page; on desktop it is the page's title row.
export function PageHeader({ eyebrow, title, right, children }) {
  return (
    <div className="flex items-end justify-between gap-4 px-1">
      <div className="min-w-0">
        {eyebrow && <p className="text-ninja-muted font-ninja text-[13px] v2 truncate">{eyebrow}</p>}
        <h1 className="text-ninja-navy font-ninja font-extrabold text-[30px] sm:text-[34px] leading-[1.05] tracking-[-0.025em] truncate">
          {title}
        </h1>
        {children}
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  );
}

// A hero. `material` comes from programTheme.beltHero / programHero.
// `size` 'card' is the home tile; 'page' is the full-bleed top of a detail
// screen. Whatever sits in `aside` (a gauge, a logo) goes on the right.
export function Hero({ material, size = 'card', eyebrow, title, subtitle, aside, footer, className = '' }) {
  const isPage = size === 'page';
  return (
    <div
      className={`relative overflow-hidden ${isPage ? 'rounded-b-[34px] px-5 pt-14 pb-5 -mx-4 sm:mx-0 sm:rounded-[28px] sm:pt-6' : 'rounded-[26px] p-5'} ${className}`}
      style={{
        background: material.background,
        color: material.color,
        boxShadow: `0 ${isPage ? 18 : 12}px ${isPage ? 44 : 30}px ${material.shadow}, inset 0 1px 0 rgb(255 255 255 / 0.32)`,
      }}
    >
      <span aria-hidden className="absolute -right-10 -top-16 w-56 h-56 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgb(255 255 255 / 0.26), transparent 65%)' }} />
      <div className="relative flex items-center justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <p className="font-ninja text-[12px] font-extrabold uppercase tracking-[0.08em] opacity-85 truncate">{eyebrow}</p>}
          <p className={`font-ninja font-extrabold leading-none tracking-[-0.02em] ${isPage ? 'text-[36px] mt-1.5' : 'text-[28px] mt-1'}`}>{title}</p>
          {subtitle && <p className="font-ninja text-[13px] mt-1.5 opacity-85">{subtitle}</p>}
        </div>
        {aside && <div className="flex-shrink-0">{aside}</div>}
      </div>
      {footer && <div className="relative mt-4">{footer}</div>}
    </div>
  );
}

// A circular gauge with a label in the middle: SwiftUI's Gauge, in CSS.
export function Gauge({ value, max, size = 72, label, ink = '#ffffff', ring = 'rgb(255 255 255 / 0.25)', face = 'rgb(0 0 0 / 0.18)' }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const deg = Math.round(pct * 360);
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }} role="img" aria-label={label || `${value} of ${max}`}>
      <span className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(${ink} 0deg ${deg}deg, ${ring} ${deg}deg 360deg)` }} />
      <span className="absolute rounded-full flex items-center justify-center font-ninja font-black"
        style={{ inset: Math.round(size * 0.095), background: face, color: ink, fontSize: Math.round(size * 0.24), boxShadow: 'inset 0 1px 0 rgb(255 255 255 / 0.25)' }}>
        {value}<span style={{ fontSize: Math.round(size * 0.14), opacity: 0.85, fontWeight: 700, marginLeft: 1 }}>/{max}</span>
      </span>
    </div>
  );
}

// Segmented bar: N pills, `done` filled, `current` half, rest empty.
export function SegmentBar({ total, done, current = false, fill = 'currentColor', empty = 'rgb(255 255 255 / 0.22)', height = 6 }) {
  const items = Array.from({ length: Math.max(0, total) }, (_, i) => i);
  return (
    <div className="flex gap-1" aria-hidden>
      {items.map((i) => {
        const filled = i < done;
        const half = !filled && current && i === done;
        return (
          <span key={i} className="flex-1 rounded-full" style={{ height, background: filled ? fill : half ? fill : empty, opacity: half ? 0.5 : 1 }} />
        );
      })}
    </div>
  );
}

// A grouped inset list card. `title` sits above the rows as an eyebrow.
export function Group({ title, action, tint, children, className = '' }) {
  return (
    <section className={`${tint ? `tint-${tint} rounded-[22px]` : `${CARD} rounded-[22px]`} overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="flex items-baseline justify-between px-4 pt-3 pb-1">
          {title && <p className="text-ninja-muted font-ninja text-[12px] v2 uppercase tracking-[0.06em]">{title}</p>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

// One row of a Group. `lead` is a 32px square (icon tile or dot), `to` makes
// the whole row a link with a chevron.
export function Row({ lead, title, subtitle, trailing, to, onClick, dim = false, first = false }) {
  const inner = (
    <>
      {lead && <span className="flex-shrink-0">{lead}</span>}
      <span className="min-w-0 flex-1">
        <span className={`block font-ninja font-extrabold text-[15px] truncate ${dim ? 'text-ninja-navy/70' : 'text-ninja-navy'}`}>{title}</span>
        {subtitle && <span className="block font-ninja text-[13px] text-ninja-muted v2 truncate">{subtitle}</span>}
      </span>
      {trailing}
      {(to || onClick) && <ChevronRightIcon size={16} className="text-ninja-muted/60 flex-shrink-0" aria-hidden />}
    </>
  );
  const cls = `flex items-center gap-3 px-4 py-2.5 ${first ? '' : 'border-t border-ninja-navy/[0.08]'} ${to || onClick ? 'hover:bg-ninja-navy/[0.03] active:bg-ninja-navy/[0.06] transition-colors' : ''}`;
  if (to) return <Link to={to} className={cls}>{inner}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={`${cls} w-full text-left`}>{inner}</button>;
  return <div className={cls}>{inner}</div>;
}

// The little square that leads a row.
export function Tile({ children, tint = 'rgb(0 106 221 / 0.12)', size = 32, rounded = 10 }) {
  return (
    <span className="inline-flex items-center justify-center" style={{ width: size, height: size, borderRadius: rounded, background: tint }}>
      {children}
    </span>
  );
}

// A small stat card: label, big number, footnote.
export function Stat({ label, value, note, tint, noteColor }) {
  return (
    <div className={`${tint ? `tint-${tint}` : CARD} rounded-[22px] p-4 flex flex-col justify-between gap-1.5 min-h-[96px]`}>
      <p className="text-ninja-muted font-ninja text-[12px] v2">{label}</p>
      <p className="text-ninja-navy font-ninja font-extrabold text-[28px] leading-none tracking-[-0.02em]">{value}</p>
      {note && <p className="font-ninja text-[12px] font-extrabold" style={{ color: noteColor || 'rgb(var(--ninja-blue-ink))' }}>{note}</p>}
    </div>
  );
}

// Status word for a project or session.
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
