import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ParentLayout, { ChildSwitcher } from '../../components/layout/ParentLayout';
import { api } from '../../api/client';
import { useParentAuth } from '../../context/ParentAuthContext';
import { useParentPortal } from '../../context/ParentPortalContext';
import { PageTitle, Hero, Emblem, ProgramMark, Group, Row, StatusText, MoreLink } from '../../components/parent/ParentUI';
import Logo from '../../components/ui/Logo';
import { FLAT } from '../../lib/surfaces';
import { SkeletonCards } from '../../components/ui/Skeleton';
import { fmtDay, fmtLongDay, calcAge } from '../../lib/parentProgress';

// Home: the family at a glance.
//
// One card per child, each led by their last class in the colour of the
// program it was in, then the few sessions before it. Above them, the week:
// which days each child was checked in. Nothing here needs a child opened;
// it all comes off the family list.

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

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

function WeekStrip({ center, kids }) {
  const days = useMemo(thisWeek, []);
  const today = ymd(new Date());
  const checked = new Map(); // ymd -> number of kids checked in that day
  for (const k of kids) {
    for (const d of k.week_checkins || []) checked.set(d, (checked.get(d) || 0) + 1);
  }
  const total = [...checked.values()].reduce((a, b) => a + b, 0);
  return (
    <section className={`${FLAT} px-4 py-3.5 sm:px-5`}>
      <div className="flex items-baseline justify-between gap-3 mb-2.5">
        <p className="font-ninja text-[11px] font-extrabold uppercase tracking-[0.08em] text-ninja-muted truncate">
          This week{center ? ` at ${center}` : ''}
        </p>
        <p className="font-ninja text-[12px] v2 text-ninja-muted flex-shrink-0">
          {total === 0 ? 'No check-ins yet' : `${total} check-in${total === 1 ? '' : 's'}`}
        </p>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const key = ymd(d);
          const isToday = key === today;
          const n = checked.get(key) || 0;
          const past = key < today;
          return (
            <div key={key} className="flex flex-col items-center gap-1">
              <span className={`font-ninja text-[11px] font-bold ${isToday ? 'text-ninja-blue-ink' : 'text-ninja-muted'}`}>{DAY_LETTERS[i]}</span>
              <span className={`w-9 h-9 rounded-full inline-flex items-center justify-center font-ninja font-extrabold text-[15px] ${isToday ? 'bg-ninja-blue text-white' : past ? 'text-ninja-navy' : 'text-ninja-navy/45'}`}>
                {d.getDate()}
              </span>
              <span className="h-1.5 flex items-center gap-0.5" aria-label={n ? `${n} checked in` : undefined}>
                {Array.from({ length: Math.min(n, 3) }, (_, j) => (
                  <span key={j} className="w-1.5 h-1.5 rounded-full bg-green-500" />
                ))}
              </span>
            </div>
          );
        })}
      </div>
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
      className="overflow-hidden rounded-[22px] text-white"
      style={{ background: '#0e1c3a' }}
      aria-label="Events at the center"
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') setPaused(true); }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') setPaused(false); }}
    >
      <div className="relative h-44 sm:h-52">
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
            {!ev.image_url && (
              {/* Opacity on the element, not the color: the mark's paths
                  overlap, and a translucent color doubles up where they do. */}
              <span aria-hidden className="absolute right-6 top-1/2 -translate-y-1/2 hidden sm:block" style={{ color: '#ffffff', opacity: 0.22 }}>
                <Logo variant="mark" className="h-16" />
              </span>
            )}
            <div className="relative h-full flex items-center px-4 sm:px-6">
              <div className="min-w-0">
                <p className="font-ninja text-[11px] font-extrabold uppercase tracking-[0.08em] opacity-90 truncate">
                  {ev.event_date ? (isToday ? 'Happening today' : 'Coming up') : 'Announcement'}{when ? ` · ${when}` : ''}
                </p>
                <p className="font-ninja font-extrabold text-[22px] sm:text-[25px] leading-tight mt-1 truncate">{ev.title}</p>
                {hook && <p className="font-ninja text-[13px] font-bold opacity-90 mt-1 line-clamp-2 sm:line-clamp-1">{hook}</p>}
                {hasMore && (
                  <button
                    type="button"
                    onClick={() => setExpanded((x) => !x)}
                    aria-expanded={expanded}
                    className="mt-2.5 inline-flex items-center gap-1 font-ninja text-[12px] font-extrabold rounded-full px-3 py-1 transition-colors"
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
          >
            <div className="px-4 sm:px-6 py-4 space-y-3" style={{ borderTop: '1px solid rgb(255 255 255 / 0.12)' }}>
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

  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <ParentLayout switcher={<ChildSwitcher withAll layoutId="parent-child-desktop" />}>
      <div className="space-y-4 lg:space-y-5">
        <PageTitle eyebrow={todayLabel} title="Home" />
        <div className="lg:hidden"><ChildSwitcher withAll layoutId="parent-child-mobile" /></div>

        <EventSlideshow events={events} />

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
            <WeekStrip center={parent?.centerName} kids={visible} />
            <div className={`grid grid-cols-1 gap-4 ${visible.length > 1 ? 'lg:grid-cols-2' : ''}`}>
              {visible.map((c) => <ChildCard key={c.id} child={c} wide={visible.length === 1} />)}
            </div>
          </>
        )}
      </div>
    </ParentLayout>
  );
}
