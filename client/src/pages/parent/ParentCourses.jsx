import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { PlusIcon } from 'lucide-react';
import ParentLayout, { ChildSwitcher } from '../../components/layout/ParentLayout';
import { useParentPortal } from '../../context/ParentPortalContext';
import { PageTitle, Hero, Emblem, BeltRoad, LevelPills, Group, Row, Tile, StatusDot, StatusText, BackChip } from '../../components/parent/ParentUI';
import useIsDesktop from '../../lib/useIsDesktop';
import { FLAT } from '../../lib/surfaces';
import { SkeletonCards } from '../../components/ui/Skeleton';
import { BELTS, getLevels } from '../../utils/beltConfig';
import { levelProjects, levelStates, levelTitle, realSessions, trackModel, fmtDay } from '../../lib/parentProgress';
import { KIT_SHORT } from '../../lib/programTheme';
import { useCurriculum } from '../../context/CurriculumContext';
import BeltIcon from '../../components/ui/BeltIcon';

// Courses: one card per program the child is in.
//
// The list shows just the programs as art cards. Tapping one opens it:
// /parent/courses/:program is the course, a full page of progress and
// curriculum with a way back at the top of its hero.
//
// CREATE is the star. Its card carries the level and the belt road; opened,
// it leads with a hero in the CREATE blue (the belt shows as its icon, not as
// the banner's colour), the level pills, the chosen level's real projects from
// the curriculum with what the log says about each, and the other levels.
// Programs without belts are tracks of modules (kits for Robotics), read off
// the curriculum and the log by trackModel: the same hero in their own art,
// the tracks as pills, the open track's modules, and the other tracks.

const EASE_OUT = [0.23, 1, 0.32, 1];
const SNAP = { type: 'spring', stiffness: 480, damping: 36 }; // critically damped, ~0.3s
const enc = (p) => encodeURIComponent(p);

// A short line about where the child is in a program.
function whereLine(enrollment, logs, model) {
  if (enrollment.program === 'CREATE') {
    return enrollment.belt_level ? `${enrollment.belt_level} belt${enrollment.belt_sublevel ? ` · Level ${enrollment.belt_sublevel}` : ''}` : 'Just getting started';
  }
  const t = model?.current;
  if (t && t.sessions > 0) {
    return [model.multi ? t.name : null, t.working ? t.working.name : null].filter(Boolean).join(' · ') || `${t.sessions} session${t.sessions === 1 ? '' : 's'}`;
  }
  return 'Just getting started';
}

// The line under a track's name: "Module 2 of 4 · Sensors".
function trackLine(t) {
  if (!t) return '';
  if (t.working) return `Module ${t.working.index} of ${t.modules.length} · ${t.working.name}`;
  if (t.modules.length) return `${t.done} of ${t.modules.length} modules`;
  return t.sessions ? `${t.sessions} session${t.sessions === 1 ? '' : 's'}` : 'Not started yet';
}

function useTrackModel(enrollment, logs) {
  const { curriculum, subPrograms } = useCurriculum();
  return useMemo(() => (enrollment.program === 'CREATE' ? null : trackModel({ program: enrollment.program, enrollment, logs, curriculum, subPrograms, shortNames: KIT_SHORT })), [enrollment, logs, curriculum, subPrograms]);
}

function CourseCard({ enrollment, logs, onOpen }) {
  const p = enrollment.program;
  const model = useTrackModel(enrollment, logs);
  // The art IS the card: the program banner fills it, the name sits on a
  // bottom wash, and the round plus is the whole affordance.
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative w-full text-left rounded-[18px] overflow-hidden shadow-sm transition-transform duration-150 active:scale-[0.985] focus-visible:outline-none"
      style={{ transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)' }}
    >
      <Hero program={p} className="aspect-[16/10] flex flex-col justify-end">
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-28 pointer-events-none"
          style={{ background: 'linear-gradient(180deg, rgb(6 13 26 / 0) 0%, rgb(6 13 26 / 0.68) 100%)' }}
        />
        <div className="relative flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="font-ninja font-extrabold text-[20px] leading-tight truncate">{p}</p>
            <p className="font-ninja text-[12.5px] font-bold opacity-85 truncate mt-0.5">{whereLine(enrollment, logs, model)}</p>
          </div>
          <span
            aria-hidden
            className="inline-flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0"
            style={{ background: 'rgb(255 255 255 / 0.18)', border: '1px solid rgb(255 255 255 / 0.28)' }}
          >
            <PlusIcon size={18} strokeWidth={2.5} />
          </span>
        </div>
      </Hero>
    </button>
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
          {backTo && <div className="mb-10 lg:mb-6"><BackChip to={backTo} label="Back to courses" /></div>}
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
        {/* The belt IS the hero's art on every width. Desktop: it fills the
            corner the banner leaves empty — `inset-y-0` off a content box
            that is as tall as the banner takes the whole vertical, and
            `right: calc(50% - 50cqw)` is the walk from that box's edge out to
            the banner's, so it takes the whole horizontal too. Square, so its
            width follows its height. Phone: a bit smaller and centered, so
            the pills row underneath still breathes. Both are cut off at the
            right and sit behind the ink: the hero's isolation lets a negative
            z sit above the gradient but under everything written. */}
        <span
          aria-hidden
          className="hidden lg:block absolute inset-y-0 right-[calc(50%-50cqw)] aspect-square pointer-events-none"
          style={{ zIndex: -1 }}
        >
          <BeltIcon belt={belt} style={{ width: '100%', height: '100%' }} />
        </span>
        <span
          aria-hidden
          className="lg:hidden absolute top-1/2 -translate-y-1/2 right-[-2rem] h-[72%] aspect-square pointer-events-none"
          style={{ zIndex: -1 }}
        >
          <BeltIcon belt={belt} style={{ width: '100%', height: '100%' }} />
        </span>
        {backTo && <div className="mb-10 lg:mb-6"><BackChip to={backTo} label="Back to courses" /></div>}
        <div className="flex items-center lg:items-start justify-between gap-5">
          <div className="flex items-center gap-4 min-w-0">
            <div className="min-w-0">
              <p className="font-ninja text-[12px] font-extrabold opacity-85 truncate">CREATE · {childName}</p>
              <p className="font-ninja font-extrabold text-[36px] lg:text-[32px] leading-none mt-1 tracking-[-0.015em]">{belt} belt</p>
              <p className="font-ninja text-[13px] opacity-85 mt-2 truncate">
                {[`Level ${currentLevel}`, levels.length ? `${pos} of ${levels.length}` : null, next ? `earns ${next}` : null, sessions.length ? `${sessions.length} session${sessions.length === 1 ? '' : 's'}` : null].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
        </div>
        <div className="lg:hidden mt-4">
          <LevelPills states={states} value={level} onChange={pick} onHero layoutId="level-pill-mobile" />
        </div>
        {/* The belt art's own room, and it cannot be a constant: the art
            reaches from the banner's right edge inward, so how far it lands
            INSIDE this box depends on how wide the page is. The margin is the
            same sum backwards — the art is about 17rem across, the gap out to
            the banner edge is `50cqw - 50%`, and what is left over is what
            the road has to give up. Floored at zero, because on a wide enough
            screen the art never reaches the column at all and the road should
            run the whole way. */}
        <BeltRoad current={belt} onHero className="mt-5 hidden lg:block lg:mr-[max(0px,calc(50%_-_50cqw_+_17rem))]" />
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
        </div>
      </div>
    </div>
  );
}

function ModuleRow({ m, first }) {
  // A module that is only called "Module 3" should not be told it is Module 3 twice.
  const label = m.name === `Module ${m.index}` ? null : `Module ${m.index}`;
  const sub = [label,
    m.status === 'done' && m.date ? `done ${fmtDay(m.date)}` : null,
    m.status === 'working' ? `working on it${m.date ? ` · ${fmtDay(m.date)}` : ''}` : null,
  ].filter(Boolean).join(' · ') || null;
  return (
    <Row first={first} inset lead={<StatusDot status={m.status} />} dim={m.status === 'todo'}
      title={m.name} subtitle={sub} trailing={m.status !== 'todo' ? <StatusText status={m.status} /> : null} />
  );
}

function TrackDetail({ enrollment, logs, childName, backTo }) {
  const p = enrollment.program;
  const model = useTrackModel(enrollment, logs);
  const { tracks, current, multi, unit } = model;
  const [openIdx, setOpenIdx] = useState(current ? current.index : 1);
  const [dir, setDir] = useState(1);
  useEffect(() => { setOpenIdx(current ? current.index : 1); }, [enrollment.id, current?.index]);
  const open = tracks.find((t) => t.index === openIdx) || current;
  const pick = (i) => { setDir(i > openIdx ? 1 : -1); setOpenIdx(i); };
  const pills = tracks.map((t) => ({ level: t.index, label: t.short, state: t.state }));
  const started = current?.sessions > 0;

  const meta = multi
    ? (current ? `${unit} ${current.index} of ${tracks.length} · ${current.name}` : 'Just getting started')
    : (current?.working ? `Module ${current.working.index} of ${current.modules.length} · ${current.working.name}` : started ? `${current.sessions} session${current.sessions === 1 ? '' : 's'}` : 'Just getting started');

  return (
    <div className="space-y-4">
      <Hero program={p} size="page">
        {backTo && <div className="mb-10 lg:mb-6"><BackChip to={backTo} label="Back to courses" /></div>}
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="hidden lg:block font-ninja text-[12px] font-extrabold opacity-85 truncate">{p} · {childName}</p>
            <p className="font-ninja font-extrabold text-[36px] lg:text-[32px] leading-[1.02] mt-1 tracking-[-0.015em]">{p}</p>
            <p className="font-ninja text-[13px] opacity-85 mt-2 truncate">{meta}</p>
          </div>
          <Emblem program={p} size={104} />
        </div>
        {multi && (
          <>
            <div className="hidden lg:block mt-5"><LevelPills states={pills} value={openIdx} onChange={pick} onHero layoutId="track-pill-desktop" /></div>
            <div className="lg:hidden mt-4"><LevelPills states={pills} value={openIdx} onChange={pick} onHero layoutId="track-pill-mobile" /></div>
          </>
        )}
      </Hero>

      {open && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={open.index}
              initial={{ opacity: 0, x: 10 * dir }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 * dir }}
              transition={{ duration: 0.18, ease: EASE_OUT }}>
              <Group tint={open.state === 'current' ? 'blue' : open.state === 'done' ? 'green' : undefined}>
                <div className="px-4 pt-3.5 pb-3">
                  <p className="font-ninja text-[11px] font-extrabold uppercase tracking-[0.08em]" style={open.state !== 'ahead' ? { color: 'var(--tint-ink)' } : { color: 'rgb(var(--ninja-muted))' }}>
                    {multi ? `${unit} ${open.index}` : 'Modules'}{open.state === 'current' ? (started ? ' · now' : ' · next') : open.state === 'done' ? ' · done' : ''}
                  </p>
                  {multi && <p className="font-ninja font-extrabold text-[20px] text-ninja-navy leading-tight mt-0.5">{open.name}</p>}
                  <p className="font-ninja text-[12.5px] v2 text-ninja-muted mt-0.5">
                    {[trackLine(open), open.first ? `started ${fmtDay(open.first)}` : null].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="mx-3 mb-3 rounded-[14px] overflow-hidden border border-ninja-navy/[0.06]">
                  {open.modules.map((m, i) => <ModuleRow key={m.name} m={m} first={i === 0} />)}
                  {open.modules.length === 0 && <p className="px-4 py-3 font-ninja text-sm text-ninja-muted tint-inset">No modules listed for this {unit.toLowerCase()} yet.</p>}
                </div>
              </Group>
            </motion.div>
          </AnimatePresence>

          {multi && (
            <Group title={`All ${unit.toLowerCase()}s`}>
              {tracks.map((t, i) => (
                <Row key={t.name} first={i === 0} onClick={() => pick(t.index)} active={t.index === openIdx} dim={t.state === 'ahead'}
                  lead={<Tile tint={t.state === 'done' ? 'rgb(34 197 94 / 0.14)' : t.state === 'current' ? 'rgb(var(--ninja-blue) / 0.14)' : 'rgb(var(--ninja-navy) / 0.06)'} color={t.state === 'done' ? '#15803d' : t.state === 'current' ? undefined : 'rgb(var(--ninja-muted))'}>{t.index}</Tile>}
                  title={t.name}
                  subtitle={[`${t.modules.length} module${t.modules.length === 1 ? '' : 's'}`, t.state === 'current' ? (started ? 'now' : 'next') : t.state === 'done' && t.last ? `done ${fmtDay(t.last)}` : null].filter(Boolean).join(' · ')}
                />
              ))}
            </Group>
          )}
        </div>
      )}
    </div>
  );
}

function CourseDetail({ enrollment, logs, childName, backTo }) {
  return enrollment.program === 'CREATE'
    ? <CreateDetail enrollment={enrollment} logs={logs} childName={childName} backTo={backTo} />
    : <TrackDetail enrollment={enrollment} logs={logs} childName={childName} backTo={backTo} />;
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

  const open = name ? enrollments.find((e) => e.program === name) : null;

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
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {enrollments.map((e) => (
        <CourseCard key={e.id || e.program} enrollment={e} logs={logsFor(e.program)} onOpen={() => navigate(`/parent/courses/${enc(e.program)}`)} />
      ))}
      {enrollments.length === 0 && (
        <div className={`${FLAT} p-8 text-center sm:col-span-2`}><p className="text-ninja-muted font-ninja text-sm">{first} is not enrolled in a program yet.</p></div>
      )}
    </div>
  );

  // With a course open, the course is the page on every width.
  if (open) {
    return (
      <ParentLayout switcher={switcher} bleed={!desktop}>
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
        {list}
      </div>
    </ParentLayout>
  );
}
