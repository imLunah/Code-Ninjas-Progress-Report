import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ParentLayout, { ChildSwitcher } from '../../components/layout/ParentLayout';
import { api } from '../../api/client';
import { useParentAuth } from '../../context/ParentAuthContext';
import { useParentPortal } from '../../context/ParentPortalContext';
import { Hero, Emblem, ProgramMark, Group, Row, StatusText, MoreLink } from '../../components/parent/ParentUI';
import Logo from '../../components/ui/Logo';
import { FLAT } from '../../lib/surfaces';
import { SkeletonCards } from '../../components/ui/Skeleton';
import { fmtDay, fmtLongDay, calcAge } from '../../lib/parentProgress';
import { hoursFor, slotsFor, slotForHour, fmtHour } from '../../lib/centerHours';

// Home: the family at a glance.
//
// One card per child, each led by their last class in the colour of the
// program it was in, then the few sessions before it. Above them, the live
// schedule: how busy the center is, hour by hour, with today's current hour
// lit. Nothing here needs a child opened; the cards come off the family list.


function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Monday to Sunday of the current week, as local dates.
function thisWeek() {
  const now = new Date();
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// How busy the center is today, by the hour, drawn the way a map app draws
// "popular times": bars on a baseline, a dashed line at the week's peak,
// hour ticks underneath, and the hour happening now in the strong colour
// with a Live marker. Every check-in is an hour of a ninja in the building,
// filed under the open hour it was closest to. Hours still to come show
// what this week's earlier days did at that hour, faintly, so the shape of
// the afternoon is there before it happens. Refreshes every minute while the
// tab is showing, so a parent deciding whether to come now is looking at now.
function LiveSchedule({ center }) {
  const days = useMemo(thisWeek, []);
  const [now, setNow] = useState(() => new Date());
  const today = ymd(now);
  const [slots, setSlots] = useState(null);
  const [hover, setHover] = useState(null); // hour whose count is showing

  useEffect(() => {
    let alive = true;
    const load = () => {
      if (document.hidden) return;
      api.get(`/parent/schedule?today=${ymd(new Date())}`)
        .then((r) => { if (alive) { setSlots(r?.slots || []); setNow(new Date()); } })
        .catch(() => { if (alive) setSlots((s) => s || []); });
    };
    load();
    const t = setInterval(load, 60_000);
    document.addEventListener('visibilitychange', load);
    return () => { alive = false; clearInterval(t); document.removeEventListener('visibilitychange', load); };
  }, []);

  // "day|slot" -> ninjas in that hour, the week's busiest hour, and the
  // week's busiest hour-of-day (summed across days) for the footnote.
  const { counts, weekMax, usual, busiestHour } = useMemo(() => {
    const counts = new Map();
    const byDay = new Map(days.map((d) => [ymd(d), d]));
    for (const { day: d, hour, count } of slots || []) {
      const date = byDay.get(d);
      if (!date) continue;
      const slot = slotForHour(date, hour);
      if (slot == null) continue;
      const k = `${d}|${slot}`;
      counts.set(k, (counts.get(k) || 0) + count);
    }
    // What earlier days this week did at each hour, averaged, for the hours
    // of today still to come.
    const sums = new Map();
    const seen = new Map();
    const totals = new Map();
    for (const [k, n] of counts) {
      const [d, h] = k.split('|');
      totals.set(h, (totals.get(h) || 0) + n);
      if (d >= today) continue;
      sums.set(h, (sums.get(h) || 0) + n);
      seen.set(h, (seen.get(h) || 0) + 1);
    }
    const usual = new Map([...sums].map(([h, sum]) => [Number(h), sum / seen.get(h)]));
    let busiestHour = null;
    let best = 0;
    for (const [h, n] of totals) if (n > best) { best = n; busiestHour = Number(h); }
    return { counts, weekMax: Math.max(1, ...counts.values()), usual, busiestHour };
  }, [slots, days, today]);

  const hourSlots = slotsFor(now);
  const nowHour = now.getHours() + now.getMinutes() / 60;
  const todayHours = hoursFor(now);
  const openNow = todayHours && nowHour >= todayHours.open && nowHour < todayHours.close;
  const nowSlot = openNow ? Math.floor(nowHour) : null;
  const inNow = nowSlot != null ? counts.get(`${today}|${nowSlot}`) || 0 : 0;

  let status;
  if (openNow) {
    status = `Open until ${fmtHour(todayHours.close)} · ${inNow === 0 ? 'quiet right now' : `${inNow} ninja${inNow === 1 ? '' : 's'} in now`}`;
  } else if (todayHours && nowHour < todayHours.open) {
    status = `Opens today at ${fmtHour(todayHours.open)}`;
  } else {
    const next = new Date(now);
    for (let i = 1; i <= 7; i++) {
      next.setDate(next.getDate() + 1);
      const h = hoursFor(next);
      if (h) { status = `Closed · Opens ${DAY_SHORT[(next.getDay() + 6) % 7]} ${fmtHour(h.open)}`; break; }
    }
  }

  const dayTotal = hourSlots.reduce((a, h) => a + (counts.get(`${today}|${h}`) || 0), 0);
  const tick = (h) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'a' : 'p'}`;

  return (
    <section className={`${FLAT} px-4 py-3.5 sm:px-5`}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-ninja text-[11px] font-extrabold uppercase tracking-[0.08em] text-ninja-muted truncate flex items-center gap-1.5">
          {openNow && <span className="relative flex w-2 h-2 flex-shrink-0" aria-hidden><span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-60" /><span className="relative rounded-full w-2 h-2 bg-green-500" /></span>}
          {openNow ? 'Live' : 'Today'}{center ? ` at ${center}` : ''}
        </p>
        <p className="font-ninja text-[12px] v2 text-ninja-muted flex-shrink-0 truncate">{status}</p>
      </div>

      {hourSlots.length === 0 ? (
        <p className="font-ninja text-sm text-ninja-muted py-6 text-center">Closed today</p>
      ) : (
        <div className="mt-4">
          {/* Peak line: the week's busiest hour is the ceiling every bar is
              measured against, so today reads against a normal week. */}
          <div className="flex items-center gap-2 mb-1">
            <span className="flex-1 border-t border-dashed border-ninja-border" aria-hidden />
            <span className="font-ninja text-[10px] text-ninja-muted">peak</span>
          </div>
          <div className="flex items-end gap-1.5 sm:gap-2 h-24 border-b border-ninja-border" role="img" aria-label={`Check-ins by hour today: ${hourSlots.map((h) => `${fmtHour(h)} ${counts.get(`${today}|${h}`) || 0}`).join(', ')}`}>
            {hourSlots.map((h, i) => {
              const n = counts.get(`${today}|${h}`) || 0;
              const live = nowSlot === h;
              const future = nowSlot == null ? nowHour < h : h > nowSlot;
              const shown = future ? (usual.get(h) || 0) : n;
              const pct = Math.min(100, Math.round((shown / weekMax) * 100));
              const showing = hover === h;
              const count = future
                ? `usually ${Math.round(shown)}`
                : `${n} ninja${n === 1 ? '' : 's'}`;
              const lift = `calc(${shown > 0 ? Math.max(pct, 6) : 2}% + 6px)`;
              return (
                <div
                  key={h}
                  className="relative flex-1 min-w-0 h-full flex flex-col justify-end cursor-default"
                  onMouseEnter={() => setHover(h)}
                  onMouseLeave={() => setHover((v) => (v === h ? null : v))}
                  onClick={() => setHover((v) => (v === h ? null : h))}
                  onFocus={() => setHover(h)}
                  onBlur={() => setHover((v) => (v === h ? null : v))}
                  tabIndex={0}
                  aria-label={`${fmtHour(h)}: ${count}`}
                >
                  {/* The count pops over the bar on hover, tap or focus; the
                      live bar's own label steps aside for it. */}
                  {showing ? (
                    <span
                      className="absolute left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-ninja-navy text-white font-ninja text-[11px] font-bold whitespace-nowrap shadow-sm pointer-events-none z-10"
                      style={{ bottom: lift }}
                    >
                      {count}
                    </span>
                  ) : live && (
                    <span className="absolute left-1/2 -translate-x-1/2 font-ninja text-[10px] font-extrabold uppercase tracking-wide text-ninja-blue-ink whitespace-nowrap" style={{ bottom: lift }}>
                      Live
                    </span>
                  )}
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${shown > 0 ? Math.max(pct, 6) : 2}%` }}
                    transition={{ type: 'spring', stiffness: 240, damping: 28, delay: i * 0.04 }}
                    className={`w-full rounded-t-md transition-colors ${live ? 'bg-ninja-blue' : future ? (showing ? 'bg-ninja-blue/30' : 'bg-ninja-blue/20') : (showing ? 'bg-ninja-blue/75' : 'bg-ninja-blue/55')}`}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex gap-1.5 sm:gap-2 mt-1.5">
            {hourSlots.map((h) => {
              const live = nowSlot === h;
              return (
                <span key={h} className={`flex-1 min-w-0 text-center font-ninja text-[11px] leading-none ${live ? 'font-extrabold text-ninja-blue-ink' : 'text-ninja-muted'}`}>{tick(h)}</span>
              );
            })}
          </div>
          {slots && (
            <p className="mt-3 font-ninja text-[12px] text-ninja-muted" aria-live="polite">
              {busiestHour != null ? `Busiest around ${fmtHour(busiestHour)} this week` : 'A quiet week so far'}
              {' · '}
              {dayTotal === 0 ? 'no check-ins yet today' : `${dayTotal} check-in${dayTotal === 1 ? '' : 's'} so far today`}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

// Markdown only loads when someone actually opens a banner's details —
// react-markdown is too heavy to ride along on every home visit.
const ReactMarkdown = lazy(() => import('react-markdown'));

// Listing descriptions are CD-authored markdown shown on the navy banner, so
// every ink is inline white. `img: () => null` stays: markdown never gets to
// draw an image on this surface (same rule as the note maps, session 32).
const BANNER_MD = {
  p: (props) => <p className="font-ninja text-[13.5px] leading-relaxed mb-2 last:mb-0" {...props} />,
  strong: (props) => <strong className="font-extrabold" style={{ color: '#ffffff' }} {...props} />,
  a: (props) => <a target="_blank" rel="noopener noreferrer" className="underline font-bold" style={{ color: '#ffffff' }} {...props} />,
  ul: (props) => <ul className="list-disc pl-5 mb-2 space-y-0.5" {...props} />,
  ol: (props) => <ol className="list-decimal pl-5 mb-2 space-y-0.5" {...props} />,
  li: (props) => <li className="font-ninja text-[13.5px] leading-relaxed" {...props} />,
  h1: (props) => <p className="font-ninja font-extrabold text-[15px] mb-1.5" style={{ color: '#ffffff' }} {...props} />,
  h2: (props) => <p className="font-ninja font-extrabold text-[14px] mb-1.5" style={{ color: '#ffffff' }} {...props} />,
  h3: (props) => <p className="font-ninja font-extrabold text-[13.5px] mb-1.5" style={{ color: '#ffffff' }} {...props} />,
  code: (props) => <code className="font-mono text-[12.5px] px-1 rounded" style={{ background: 'rgb(255 255 255 / 0.15)' }} {...props} />,
  blockquote: (props) => <blockquote className="pl-3 mb-2" style={{ borderLeft: '2px solid rgb(255 255 255 / 0.3)' }} {...props} />,
  img: () => null,
};

// Markdown syntax has no place in the banner's one-line hook.
function stripMd(text = '') {
  return text
    .replace(/[*_`#>]/g, '')
    .replace(/^\s*[-+]\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .trim();
}

// The center's event listings, at the top of the home. One listing is a
// banner; more than one rotates like a slideshow, sliding to the next every
// few seconds, with dots to jump. A mouse resting on it holds it still, and
// Learn more grows the banner downward in place — description, event info
// and the sign-up link — instead of leaving the page; the slideshow waits
// while it is open. No date tile: the eyebrow already says the date, and the
// tile sat on top of the artwork. Everything is inline color: the image gets
// a dark wash for the white ink, the imageless fallback is a deep navy, and
// neither can be fought by the .dark overrides.
//
// The banner runs edge to edge across the content region: it escapes main's
// max-w-6xl column with the left-1/2 trick sized in container units — main is
// a size container in ParentLayout, so 100cqw is the region beside the side
// nav, where w-screen would run underneath it. Its ink stays in its own inner
// max-w-6xl column so the text still lines up with the page content below.
function EventSlideshow({ events }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { if (idx >= events.length && events.length) setIdx(0); }, [events.length, idx]);
  // Only a mouse pauses: a touch has no "leave", so a pointer pause on a
  // phone would stick and the slideshow would never move again.
  useEffect(() => {
    if (events.length < 2 || paused || expanded) return;
    const t = setInterval(() => setIdx((n) => (n + 1) % events.length), 6000);
    return () => clearInterval(t);
  }, [events.length, paused, expanded]);
  if (!events.length) return null;

  const ev = events[Math.min(idx, events.length - 1)];
  const isToday = ev.event_date === ymd(new Date());
  const when = ev.event_date
    ? `${isToday ? 'Today' : fmtLongDay(ev.event_date)}${ev.event_time ? ` · ${ev.event_time}` : ''}`
    : null;
  const hook = ev.subtitle || (ev.description ? stripMd(ev.description.split('\n')[0]) : null);
  const hasMore = Boolean(ev.description || ev.event_url || when);

  return (
    <section
      className="relative left-1/2 -translate-x-1/2 w-[100cqw] -mt-5 lg:-mt-7 overflow-hidden text-white"
      style={{ background: '#0e1c3a' }}
      aria-label="Events at the center"
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') setPaused(true); }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') setPaused(false); }}
    >
      <div className="relative h-56 sm:h-64 lg:h-72">
        <AnimatePresence initial={false}>
          <motion.div
            key={ev.id}
            className="absolute inset-0"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
          >
            <span
              aria-hidden
              className="absolute inset-0"
              style={ev.image_url
                ? { background: `url("${ev.image_url}") center / cover no-repeat` }
                : { background: 'linear-gradient(135deg, #12264d 0%, #0b3d8f 100%)' }}
            />
            {/* The wash that keeps white ink readable on any artwork. */}
            <span aria-hidden className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgb(6 11 24 / 0.82) 0%, rgb(6 11 24 / 0.55) 55%, rgb(6 11 24 / 0.2) 100%)' }} />
            <div className="relative h-full max-w-6xl mx-auto flex items-center px-4 sm:px-6">
              {/* Opacity on the element, not the color: the mark's paths
                  overlap, and a translucent color doubles up where they do. */}
              {!ev.image_url && (
                <span aria-hidden className="absolute right-6 top-1/2 -translate-y-1/2 hidden sm:block" style={{ color: '#ffffff', opacity: 0.22 }}>
                  <Logo variant="mark" className="h-24" />
                </span>
              )}
              <div className="min-w-0">
                <p className="font-ninja text-[12px] sm:text-[13px] font-extrabold uppercase tracking-[0.08em] opacity-90 truncate">
                  {ev.event_date ? (isToday ? 'Happening today' : 'Coming up') : 'Announcement'}{when ? ` · ${when}` : ''}
                </p>
                <p className="font-ninja font-extrabold text-[28px] sm:text-[34px] lg:text-[40px] leading-tight mt-1.5 truncate">{ev.title}</p>
                {hook && <p className="font-ninja text-[14px] sm:text-[16px] font-bold opacity-90 mt-1.5 line-clamp-2 sm:line-clamp-1">{hook}</p>}
                {hasMore && (
                  <button
                    type="button"
                    onClick={() => setExpanded((x) => !x)}
                    aria-expanded={expanded}
                    className="mt-3.5 inline-flex items-center gap-1 font-ninja text-[13px] sm:text-[14px] font-extrabold rounded-full px-4 py-1.5 transition-colors"
                    style={{ background: 'rgb(255 255 255 / 0.18)', border: '1px solid rgb(255 255 255 / 0.3)' }}
                  >
                    {expanded ? 'Show less' : 'Learn more ›'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
        {events.length > 1 && (
          <span className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            {events.map((e, i) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`Show event ${i + 1} of ${events.length}`}
                aria-current={i === Math.min(idx, events.length - 1) ? 'true' : undefined}
                className="w-2 h-2 rounded-full transition-colors"
                style={{ background: i === Math.min(idx, events.length - 1) ? 'rgb(255 255 255 / 0.95)' : 'rgb(255 255 255 / 0.4)' }}
              />
            ))}
          </span>
        )}
      </div>

      {/* The detail sheet the banner grows into. Same surface, so the growth
          reads as the banner getting taller, not a second card appearing. */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
            style={{ borderTop: '1px solid rgb(255 255 255 / 0.12)' }}
          >
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 space-y-3">
              {when && (
                <p className="font-ninja text-[13px] font-extrabold">
                  {isToday ? 'Today' : fmtLongDay(ev.event_date)}{ev.event_time ? ` · ${ev.event_time}` : ''}
                </p>
              )}
              {ev.description && (
                <div style={{ color: 'rgb(255 255 255 / 0.88)' }}>
                  <Suspense fallback={<p className="font-ninja text-[13.5px] leading-relaxed whitespace-pre-line">{stripMd(ev.description)}</p>}>
                    <ReactMarkdown
                      components={BANNER_MD}
                      urlTransform={(url) => (/^(https?:|mailto:)/i.test(url) ? url : '')}
                    >
                      {ev.description}
                    </ReactMarkdown>
                  </Suspense>
                </div>
              )}
              {ev.event_url && (
                <p>
                  <a
                    href={ev.event_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-ninja text-[13px] font-extrabold rounded-full px-4 py-1.5"
                    style={{ background: '#ffffff', color: '#0c2f6b' }}
                  >
                    Sign up ›
                  </a>
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// What to say about a session in one line under its title.
function sessionLine(s) {
  const bits = [s.program];
  if (s.program === 'CREATE' && s.belt_level_at) {
    bits.push(`${s.belt_level_at} belt${s.belt_sublevel_at ? `, level ${s.belt_sublevel_at}` : ''}`);
  } else if (s.sub_program || s.module_name) {
    bits.push([s.sub_program, s.module_name].filter(Boolean).join(' · '));
  }
  return bits.filter(Boolean).join(' · ');
}

function sessionTitle(s) {
  return s.project_at || s.lesson_name || s.module_name || s.sub_program || `${s.program} session`;
}

// "CREATE, Robotics Academy" or "CREATE, Robotics Academy +2".
function programList(programs) {
  const names = programs.map((p) => p.program);
  if (!names.length) return 'Not enrolled yet';
  return names.length <= 2 ? names.join(', ') : `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
}

function firstName(name) {
  return String(name || '').trim().split(' ')[0];
}

// `wide` is the one-ninja layout: the card is the whole row, so instead of a
// stack it becomes two columns at lg — hero on the left grown to the height
// of the list beside it, recent sessions on the right — under a full-width
// header. With siblings the stacked card in a half column stays.
function ChildCard({ child, wide = false }) {
  const programs = child.programs || [];
  const sessions = child.recent_sessions || [];
  const clubs = child.recent_clubs || [];
  const last = sessions[0] || null;
  const heroProgram = last?.program || programs[0]?.program || 'CREATE';
  const enrollment = programs.find((p) => p.program === heroProgram) || programs[0] || null;
  const belt = heroProgram === 'CREATE' ? (enrollment?.belt_level || last?.belt_level_at || null) : null;
  const age = calcAge(child.birthday);
  const since = child.created_at ? new Date(child.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : null;

  const recent = [
    ...sessions.slice(1).map((s) => ({ key: `s${s.session_date}${s.created_at}`, date: s.session_date, title: sessionTitle(s), sub: `${s.program} · ${fmtDay(s.session_date)}`, status: s.status_at })),
    ...clubs.map((c) => ({ key: `c${c.session_date}${c.club_name}`, date: c.session_date, title: c.club_name, sub: `Club · ${fmtDay(c.session_date)}`, status: 'club' })),
  ].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 3);

  const profile = `/parent/students/${child.id}`;

  return (
    <article className={`${FLAT} p-4 sm:p-5 flex flex-col gap-4 ${wide ? 'lg:grid lg:grid-cols-2 lg:gap-x-6' : ''}`}>
      <header className={`flex items-center gap-3 ${wide ? 'lg:col-span-2' : ''}`}>
        <ProgramMark program={programs[0]?.program} />
        <div className="min-w-0 flex-1">
          <h2 className="font-ninja font-extrabold text-[17px] text-ninja-navy leading-tight truncate">{child.full_name}</h2>
          <p className="font-ninja text-[12.5px] v2 text-ninja-muted truncate">
            {[age != null && age >= 3 ? `Age ${age}` : null, programList(programs), since ? `since ${since}` : null].filter(Boolean).join(' · ')}
          </p>
        </div>
        <MoreLink to={profile}>Full profile</MoreLink>
      </header>

      {/* In the wide card the grid stretches the hero to the list's height,
          so it becomes a flex that centres its content in the taller banner. */}
      <Hero program={heroProgram} className={wide ? 'lg:flex lg:items-center lg:p-6' : ''}>
        <div className={`flex items-center justify-between gap-4 ${wide ? 'lg:flex-1' : ''}`}>
          <div className="min-w-0">
            <p className="font-ninja text-[12px] font-extrabold opacity-85 truncate">
              {last ? `Last class · ${fmtLongDay(last.session_date)}` : 'No classes logged yet'}
            </p>
            <p className="font-ninja font-extrabold text-[22px] leading-tight mt-1 truncate">
              {last ? sessionTitle(last) : heroProgram}
            </p>
            <p className="font-ninja text-[13px] opacity-85 mt-1 truncate">
              {last
                ? [sessionLine(last), last.sensei_name ? `with Sensei ${firstName(last.sensei_name)}` : null].filter(Boolean).join(' · ')
                : belt ? `${belt} belt${enrollment?.belt_sublevel ? `, level ${enrollment.belt_sublevel}` : ''}` : 'Just getting started'}
            </p>
          </div>
          <Emblem program={heroProgram} belt={belt} size={64} />
        </div>
      </Hero>

      {recent.length > 0 ? (
        <Group title="Recent" action={<MoreLink to={profile}>All sessions</MoreLink>} className="!rounded-[16px]">
          {recent.map((r, i) => (
            <Row key={r.key} first={i === 0} title={r.title} subtitle={r.sub} trailing={<StatusText status={r.status} />} />
          ))}
        </Group>
      ) : (
        <p className={`font-ninja text-[13px] v2 text-ninja-muted px-1 ${wide ? 'lg:self-center' : ''}`}>
          {last ? 'The rest of the history is on the profile.' : 'Sessions show up here as soon as a sensei logs one.'}
        </p>
      )}
    </article>
  );
}

export default function ParentHome() {
  const { parent } = useParentAuth();
  const { students, listError, activeId, viewAll } = useParentPortal();
  // The center's published event listings for the slideshow. `today` is the
  // browser's local date so an event stays "today" through its own evening —
  // the server clock is UTC and would drop it at 5pm California time.
  const [events, setEvents] = useState([]);
  useEffect(() => {
    let alive = true;
    api.get(`/parent/events?today=${ymd(new Date())}`)
      .then((rows) => { if (alive) setEvents(rows || []); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const visible = useMemo(() => {
    if (!students) return [];
    if (viewAll || students.length < 2) return students;
    return students.filter((s) => s.id === activeId);
  }, [students, activeId, viewAll]);

  return (
    <ParentLayout switcher={<ChildSwitcher withAll layoutId="parent-child-desktop" />}>
      <div className="space-y-4 lg:space-y-5">
        {/* The banner is the page's opening, where the Home title used to be:
            first in flow, and its negative margin eats main's top padding so
            the full-bleed navy sits flush with the top of the page. */}
        <EventSlideshow events={events} />

        <div className="lg:hidden"><ChildSwitcher withAll layoutId="parent-child-mobile" /></div>

        {students === null ? (
          <SkeletonCards count={2} cols="lg:grid-cols-2" height={320} label="Loading your family" />
        ) : listError ? (
          <div className={`${FLAT} p-8 text-center`}><p className="text-ninja-red font-ninja text-sm">{listError}</p></div>
        ) : students.length === 0 ? (
          <div className={`${FLAT} p-8 text-center space-y-1`}>
            <p className="text-ninja-navy font-ninja font-bold">No ninjas are linked to this email yet.</p>
            <p className="text-ninja-muted font-ninja text-sm">Ask the front desk to add your email to your child's record.</p>
          </div>
        ) : (
          <>
            <LiveSchedule center={parent?.centerName} />
            <div className={`grid grid-cols-1 gap-4 ${visible.length > 1 ? 'lg:grid-cols-2' : ''}`}>
              {visible.map((c) => <ChildCard key={c.id} child={c} wide={visible.length === 1} />)}
            </div>
          </>
        )}
      </div>
    </ParentLayout>
  );
}
