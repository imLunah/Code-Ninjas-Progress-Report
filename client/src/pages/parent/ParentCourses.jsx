import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRightIcon } from 'lucide-react';
import ParentLayout, { ChildSwitcher } from '../../components/layout/ParentLayout';
import { useParentPortal } from '../../context/ParentPortalContext';
import { PageTitle, Hero, Emblem, ProgramMark, BeltRoad, LevelPills, Group, Row, Tile, StatusDot, StatusText, BackChip } from '../../components/parent/ParentUI';
import ProgressVisuals from '../../components/parent/ProgressVisuals';
import useIsDesktop from '../../lib/useIsDesktop';
import { FLAT } from '../../lib/surfaces';
import { SkeletonCards } from '../../components/ui/Skeleton';
import { BELTS, getLevels } from '../../utils/beltConfig';
import { levelProjects, levelStates, levelTitle, realSessions, fmtDay } from '../../lib/parentProgress';

// Courses: one card per program the child is in, and the one that is open.
//
// On desktop the cards run down the left and the open course fills the right;
// on a phone the list is the page and a card opens the course on its own,
// with a way back at the top of its hero. Both read the same URL:
// /parent/courses/:program is the open one.
//
// CREATE is the star. Its card carries the level and the belt road; opened,
// it leads with a hero in the CREATE blue (the belt shows as its icon, not as
// the banner's colour), the level pills, the chosen level's real projects from
// the curriculum with what the log says about each, and the other levels.
// Programs without belts keep the module and kit views the portal already
// derived, under a hero in their own art.

const EASE_OUT = [0.23, 1, 0.32, 1];
const SNAP = { type: 'spring', stiffness: 480, damping: 36 }; // critically damped, ~0.3s
const enc = (p) => encodeURIComponent(p);

// A short line about where the child is in a program.
function whereLine(enrollment, logs) {
  if (enrollment.program === 'CREATE') {
    return enrollment.belt_level ? `${enrollment.belt_level} belt${enrollment.belt_sublevel ? ` · Level ${enrollment.belt_sublevel}` : ''}` : 'Just getting started';
  }
  const bits = [enrollment.last_sub_program, enrollment.last_module_name].filter(Boolean);
  if (bits.length) return bits.join(' · ');
  const n = realSessions(logs).length;
  return n ? `${n} session${n === 1 ? '' : 's'}` : 'Just getting started';
}

function CourseCard({ enrollment, logs, selected, showRing }) {
  const p = enrollment.program;
  const isCreate = p === 'CREATE';
  const belt = enrollment.belt_level;
  const levels = isCreate && belt ? getLevels(belt) : [];
  // A belt with no level recorded is at its first: the bonus tracks are
  // logged by project, and the level column stays empty.
  const level = Number(enrollment.belt_sublevel) || (levels[0] ?? null);
  const pos = level ? levels.indexOf(level) + 1 : 0;
  const projects = isCreate && belt && level ? levelProjects(belt, level, logs) : [];
  const done = projects.filter((x) => x.status === 'done').length;

  return (
    <Link
      to={`/parent/courses/${enc(p)}`}
      aria-current={selected ? 'true' : undefined}
      className={`relative block ${FLAT} p-4 transition-transform duration-150 active:scale-[0.985] focus-visible:outline-none`}
      style={{ transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)' }}
    >
      {/* The selection travels between cards instead of blinking off and on. */}
      {showRing && selected && (
        <motion.span layoutId="course-ring" transition={SNAP} aria-hidden
          className="absolute -inset-px rounded-[22px] pointer-events-none border-2 border-ninja-blue" />
      )}
      <div className="flex items-center gap-3 mb-3">
        <ProgramMark program={p} />
        <div className="min-w-0 flex-1">
          <p className="font-ninja font-extrabold text-[16px] text-ninja-navy leading-tight truncate">{p}</p>
          <p className="font-ninja text-[12.5px] v2 text-ninja-muted truncate">{whereLine(enrollment, logs)}</p>
        </div>
        <ChevronRightIcon size={18} className="text-ninja-muted/60 flex-shrink-0" aria-hidden />
      </div>

      <Hero program={p}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            {isCreate ? (
              <>
                <p className="font-ninja text-[12px] font-extrabold opacity-85">{belt ? `${belt} belt` : 'CREATE'}</p>
                <p className="font-ninja font-extrabold text-[24px] leading-tight mt-0.5">
                  {level ? <>Level {level}{levels.length > 0 && <span className="text-[14px] opacity-80 ml-1.5">{pos} of {levels.length}</span>}</> : 'White belt ahead'}
                </p>
                <p className="font-ninja text-[13px] opacity-85 mt-0.5">
                  {projects.length ? `${done} of ${projects.length} projects done this level` : 'The first project is next'}
                </p>
              </>
            ) : (
              <>
                <p className="font-ninja text-[12px] font-extrabold opacity-85">{enrollment.last_sub_program ? 'Current kit' : 'Now'}</p>
                <p className="font-ninja font-extrabold text-[22px] leading-tight mt-0.5 truncate">
                  {enrollment.last_sub_program || enrollment.last_module_name || p}
                </p>
                <p className="font-ninja text-[13px] opacity-85 mt-0.5 truncate">
                  {enrollment.last_sub_program && enrollment.last_module_name ? enrollment.last_module_name : `${realSessions(logs).length} sessions`}
                </p>
              </>
            )}
          </div>
          <Emblem program={p} belt={isCreate ? belt : null} size={60} />
        </div>
        {isCreate && <BeltRoad current={belt} onHero compact className="mt-3" />}
      </Hero>
    </Link>
  );
}

function ProjectRow({ p, first }) {
  const adventure = p.kind === 'Adventure';
  const sub = adventure
    ? (p.status === 'todo' ? 'Adventure · unlocks last' : `Adventure${p.date ? ` · ${fmtDay(p.date)}` : ''}`)
    : `${p.kind}${p.date ? ` · ${p.status === 'done' ? 'done' : 'last'} ${fmtDay(p.date)}` : ''}`;
  return (
    <Row first={first} inset lead={<StatusDot status={p.status} adventure={adventure} />} dim={p.status === 'todo'}
      title={p.name} subtitle={sub} trailing={p.status !== 'todo' ? <StatusText status={p.status} /> : null} />
  );
}

function CreateDetail({ enrollment, logs, childName, backTo }) {
  const belt = enrollment.belt_level;
  const currentLevel = Number(enrollment.belt_sublevel) || (getLevels(belt)[0] ?? 1);
  const levels = getLevels(belt);
  const pos = levels.indexOf(currentLevel) + 1;
  const [level, setLevel] = useState(currentLevel);
  const [dir, setDir] = useState(1);
  useEffect(() => { setLevel(currentLevel); }, [enrollment.id, currentLevel]);

  const states = useMemo(() => levelStates(belt, currentLevel), [belt, currentLevel]);
  const projects = useMemo(() => levelProjects(belt, level, logs), [belt, level, logs]);
  const done = projects.filter((p) => p.status === 'done').length;
  const sessions = realSessions(logs);
  const beltIdx = BELTS.findIndex((b) => b.name === belt);
  const next = beltIdx >= 0 ? BELTS[beltIdx + 1]?.name : null;
  const levelState = states.find((s) => s.level === level)?.state;
  const started = useMemo(() => {
    const ds = sessions.filter((l) => l.belt_level_at === belt && Number(l.belt_sublevel_at) === Number(level)).map((l) => String(l.session_date).split('T')[0]).sort();
    return ds[0] || null;
  }, [sessions, belt, level]);

  const pick = (lv) => { setDir(lv > level ? 1 : -1); setLevel(lv); };

  if (!belt) {
    return (
      <div className="space-y-4">
        <Hero program="CREATE" size="page">
          {backTo && <div className="mb-4"><BackChip to={backTo} label="Back to courses" /></div>}
          <p className="font-ninja text-[12px] font-extrabold opacity-85">CREATE · {childName}</p>
          <p className="font-ninja font-extrabold text-[32px] leading-tight mt-1">White belt ahead</p>
          <p className="font-ninja text-[13px] opacity-85 mt-1">The belt road starts with the first logged session.</p>
        </Hero>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Hero program="CREATE" size="page">
        {backTo && <div className="mb-4"><BackChip to={backTo} label="Back to courses" /></div>}
        <div className="flex items-start justify-between gap-5">
          <div className="flex items-center gap-4 min-w-0">
            <Emblem program="CREATE" belt={belt} size={72} />
            <div className="min-w-0">
              <p className="font-ninja text-[12px] font-extrabold opacity-85 truncate">CREATE · {childName}</p>
              <p className="font-ninja font-extrabold text-[32px] leading-none mt-1 tracking-[-0.01em]">{belt} belt</p>
              <p className="font-ninja text-[13px] opacity-85 mt-2 truncate">
                {[`Level ${currentLevel}`, levels.length ? `${pos} of ${levels.length}` : null, next ? `earns ${next}` : null, sessions.length ? `${sessions.length} session${sessions.length === 1 ? '' : 's'}` : null].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
          <div className="hidden lg:block flex-shrink-0 pt-1">
            <LevelPills states={states} value={level} onChange={pick} onHero layoutId="level-pill-desktop" />
          </div>
        </div>
        <div className="lg:hidden mt-4">
          <LevelPills states={states} value={level} onChange={pick} onHero layoutId="level-pill-mobile" />
        </div>
        <BeltRoad current={belt} onHero className="mt-5 hidden lg:block" />
      </Hero>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={level}
            initial={{ opacity: 0, x: 10 * dir }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 * dir }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
          >
            <Group tint={levelState === 'current' ? 'green' : levelState === 'done' ? 'blue' : undefined}>
              <div className="px-4 pt-3.5 pb-3">
                <p className="font-ninja text-[11px] font-extrabold uppercase tracking-[0.08em]" style={levelState ? { color: 'var(--tint-ink)' } : undefined}>
                  Level {level}{levelState === 'current' ? ' · now' : levelState === 'done' ? ' · done' : ' · ahead'}
                </p>
                {levelTitle(belt, level) !== `Level ${level}` && (
                  <p className="font-ninja font-extrabold text-[20px] text-ninja-navy leading-tight mt-0.5">{levelTitle(belt, level)}</p>
                )}
                <p className="font-ninja text-[12.5px] v2 text-ninja-muted mt-0.5">
                  {[`${done} of ${projects.length} projects`, started ? `started ${fmtDay(started)}` : null].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className={`mx-3 mb-3 rounded-[14px] overflow-hidden ${levelState ? 'border border-ninja-navy/[0.06]' : ''}`}>
                {projects.map((p, i) => <ProjectRow key={p.name} p={p} first={i === 0} />)}
                {projects.length === 0 && <p className="px-4 py-3 font-ninja text-sm text-ninja-muted">No projects listed for this level yet.</p>}
              </div>
            </Group>
          </motion.div>
        </AnimatePresence>

        <div className="space-y-4">
          <Group title="All levels">
            {states.map((s, i) => {
              const finished = sessions.filter((l) => l.belt_level_at === belt && Number(l.belt_sublevel_at) === s.level && l.status_at === 'Completed').map((l) => String(l.session_date).split('T')[0]).sort();
              const lastDone = finished[finished.length - 1] || null;
              return (
                <Row key={s.level} first={i === 0} onClick={() => pick(s.level)} active={s.level === level} dim={s.state === 'ahead'}
                  lead={<Tile tint={s.state === 'done' ? 'rgb(34 197 94 / 0.14)' : s.state === 'current' ? 'rgb(var(--ninja-blue) / 0.14)' : 'rgb(var(--ninja-navy) / 0.06)'} color={s.state === 'done' ? '#15803d' : s.state === 'current' ? undefined : 'rgb(var(--ninja-muted))'}>{s.level}</Tile>}
                  title={`Level ${s.level}`}
                  subtitle={[`${s.projectCount} project${s.projectCount === 1 ? '' : 's'}`, s.state === 'current' ? 'now' : s.state === 'done' && lastDone ? `done ${fmtDay(lastDone)}` : null].filter(Boolean).join(' · ')}
                />
              );
            })}
          </Group>
          <div className={`${FLAT} p-4 lg:hidden`}>
            <p className="font-ninja text-[11px] font-extrabold uppercase tracking-[0.08em] text-ninja-muted mb-2">Belt road</p>
            <BeltRoad current={belt} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgramDetail({ enrollment, logs, childName, backTo }) {
  const p = enrollment.program;
  const sessions = realSessions(logs).length;
  return (
    <div className="space-y-4">
      <Hero program={p} size="page">
        {backTo && <div className="mb-4"><BackChip to={backTo} label="Back to courses" /></div>}
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-ninja text-[12px] font-extrabold opacity-85 truncate">{p} · {childName}</p>
            <p className="font-ninja font-extrabold text-[32px] leading-none mt-1 tracking-[-0.01em] truncate">
              {enrollment.last_sub_program || enrollment.last_module_name || p}
            </p>
            <p className="font-ninja text-[13px] opacity-85 mt-2 truncate">
              {[enrollment.last_sub_program && enrollment.last_module_name ? enrollment.last_module_name : null, sessions ? `${sessions} session${sessions === 1 ? '' : 's'}` : 'Just getting started'].filter(Boolean).join(' · ')}
            </p>
          </div>
          <Emblem program={p} size={72} />
        </div>
      </Hero>
      <ProgressVisuals programs={[enrollment]} sessionLogs={logs} />
    </div>
  );
}

function CourseDetail({ enrollment, logs, childName, backTo }) {
  return enrollment.program === 'CREATE'
    ? <CreateDetail enrollment={enrollment} logs={logs} childName={childName} backTo={backTo} />
    : <ProgramDetail enrollment={enrollment} logs={logs} childName={childName} backTo={backTo} />;
}

export default function ParentCourses() {
  const { program } = useParams();
  const navigate = useNavigate();
  const desktop = useIsDesktop();
  const { students, active, detail, detailLoading } = useParentPortal();
  const name = program ? decodeURIComponent(program) : null;
  const enrollments = detail?.programs || [];
  const logsFor = (p) => (detail?.session_logs || []).filter((l) => l.program === p);
  const first = active?.full_name?.split(' ')[0] || '';

  // Desktop always has a course open: the one in the URL, else the first.
  const openName = name || (desktop ? enrollments[0]?.program : null) || null;
  const open = openName ? enrollments.find((e) => e.program === openName) : null;

  // A course in the URL that this child is not in (the switcher moved to a
  // sibling, or an old link): fall back to the list.
  useEffect(() => {
    if (name && detail && !enrollments.some((e) => e.program === name)) navigate('/parent/courses', { replace: true });
  }, [name, detail, enrollments, navigate]);

  const switcher = <ChildSwitcher layoutId="parent-child-desktop" />;
  const loading = students === null || (active && detailLoading && !detail);

  const header = (
    <>
      <PageTitle title="Courses" eyebrow={active ? `${first} · ${enrollments.length} program${enrollments.length === 1 ? '' : 's'}` : ''} />
      <div className="lg:hidden"><ChildSwitcher layoutId="parent-child-mobile" /></div>
    </>
  );

  if (loading) {
    return (
      <ParentLayout switcher={switcher}>
        <div className="space-y-4">{header}<SkeletonCards count={2} cols="lg:grid-cols-2" height={220} label="Loading courses" /></div>
      </ParentLayout>
    );
  }

  if (!active) {
    return (
      <ParentLayout switcher={switcher}>
        <div className="space-y-4">{header}
          <div className={`${FLAT} p-8 text-center`}><p className="text-ninja-muted font-ninja text-sm">No ninjas are linked to this email yet.</p></div>
        </div>
      </ParentLayout>
    );
  }

  const list = (
    <div className="space-y-3">
      {enrollments.map((e) => (
        <CourseCard key={e.id || e.program} enrollment={e} logs={logsFor(e.program)} selected={desktop && open?.program === e.program} showRing={desktop} />
      ))}
      {enrollments.length === 0 && (
        <div className={`${FLAT} p-8 text-center`}><p className="text-ninja-muted font-ninja text-sm">{first} is not enrolled in a program yet.</p></div>
      )}
    </div>
  );

  // Phone, with a course open: the course is the page.
  if (!desktop && open) {
    return (
      <ParentLayout switcher={switcher}>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: EASE_OUT }}>
          <CourseDetail enrollment={open} logs={logsFor(open.program)} childName={first} backTo="/parent/courses" />
        </motion.div>
      </ParentLayout>
    );
  }

  return (
    <ParentLayout switcher={switcher}>
      <div className="space-y-4 lg:space-y-5">
        {header}
        {desktop ? (
          <div className="grid grid-cols-[400px_minmax(0,1fr)] gap-6 items-start">
            {list}
            <div className="min-w-0">
              <AnimatePresence mode="wait" initial={false}>
                {open && (
                  <motion.div key={open.program}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.18, ease: EASE_OUT }}>
                    <CourseDetail enrollment={open} logs={logsFor(open.program)} childName={first} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : list}
      </div>
    </ParentLayout>
  );
}
