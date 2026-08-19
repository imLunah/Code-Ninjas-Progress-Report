import { useMemo } from 'react';
import ParentLayout, { ChildSwitcher } from '../../components/layout/ParentLayout';
import { useParentAuth } from '../../context/ParentAuthContext';
import { useParentPortal } from '../../context/ParentPortalContext';
import { PageTitle, Hero, Emblem, ProgramMark, Group, Row, StatusText, MoreLink } from '../../components/parent/ParentUI';
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

function ChildCard({ child }) {
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
    <article className={`${FLAT} p-4 sm:p-5 flex flex-col gap-4`}>
      <header className="flex items-center gap-3">
        <ProgramMark program={programs[0]?.program} />
        <div className="min-w-0 flex-1">
          <h2 className="font-ninja font-extrabold text-[17px] text-ninja-navy leading-tight truncate">{child.full_name}</h2>
          <p className="font-ninja text-[12.5px] v2 text-ninja-muted truncate">
            {[age != null && age >= 3 ? `Age ${age}` : null, programList(programs), since ? `since ${since}` : null].filter(Boolean).join(' · ')}
          </p>
        </div>
        <MoreLink to={profile}>Full profile</MoreLink>
      </header>

      <Hero program={heroProgram}>
        <div className="flex items-center justify-between gap-4">
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
        <p className="font-ninja text-[13px] v2 text-ninja-muted px-1">
          {last ? 'The rest of the history is on the profile.' : 'Sessions show up here as soon as a sensei logs one.'}
        </p>
      )}
    </article>
  );
}

export default function ParentHome() {
  const { parent } = useParentAuth();
  const { students, listError, activeId, viewAll } = useParentPortal();

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
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {visible.map((c) => <ChildCard key={c.id} child={c} />)}
            </div>
          </>
        )}
      </div>
    </ParentLayout>
  );
}
