import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRightIcon, XIcon } from 'lucide-react';
import ParentLayout, { ChildSwitcher } from '../../components/layout/ParentLayout';
import { useParentPortal } from '../../context/ParentPortalContext';
import { PageTitle, Hero, Emblem, ProgramMark, BeltRoad, LevelPills, Group, Row, Tile, StatusDot, StatusText, BackChip } from '../../components/parent/ParentUI';
import useIsDesktop from '../../lib/useIsDesktop';
import { FLAT } from '../../lib/surfaces';
import { SkeletonCards } from '../../components/ui/Skeleton';
import { BELTS, getLevels } from '../../utils/beltConfig';
import { levelProjects, levelStates, levelTitle, realSessions, trackModel, fmtDay } from '../../lib/parentProgress';
import { KIT_SHORT } from '../../lib/programTheme';
import { useCurriculum } from '../../context/CurriculumContext';

// Courses: one card per program the child is in.
//
// The list shows just the programs. Tapping a card grows it into a modal
// (a layoutId morph, card to sheet) that says what the course IS, with one
// button to open it; /parent/courses/:program is the opened course, a full
// page of progress and curriculum with a way back at the top of its hero.
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

// What each course IS, written for a parent reading over breakfast.
const COURSE_ABOUT = {
  CREATE: "The flagship coding journey. Ninjas climb the belt ladder from White toward Black, building real video games in JavaScript as they go. Every level ends with a project they can show off, and every belt is a skill milestone they earned.",
  JR: "Where the youngest ninjas begin, around ages 5 to 7. Visual, hands-on activities build the foundations of coding: sequencing, loops, and problem solving, all through play.",
  'Robotics Academy': "Hands-on engineering with real robots. Ninjas build, wire, and program their bots kit by kit, learning how sensors, motors, and code come together to make something move.",
  'AI Academy': "A guided look inside artificial intelligence. Ninjas learn how AI actually works, then put it to use in their own creative projects.",
  'VR Coding': "Ninjas design and code their own virtual reality worlds, then step inside what they built.",
  Silver: "Advanced game development for ninjas who have pushed past the core belts. Bigger projects, deeper code, more independence.",
  'Gold Unity': "Professional game development in Unity with C#, the same engine behind many of the games they already play.",
  'Gold Godot': "Game development in the Godot engine: full games, built with a modern open toolkit.",
};

function CourseCard({ enrollment, logs, onOpen }) {
  const p = enrollment.program;
  const model = useTrackModel(enrollment, logs);
  return (
    <motion.button
      type="button"
      layoutId={`course-${p}`}
      onClick={onOpen}
      className={`relative w-full text-left ${FLAT} p-4 transition-transform duration-150 active:scale-[0.985] focus-visible:outline-none`}
      style={{ transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)' }}
    >
      <div className="flex items-center gap-3">
        <ProgramMark program={p} />
        <div className="min-w-0 flex-1">
          <p className="font-ninja font-extrabold text-[16px] text-ninja-navy leading-tight truncate">{p}</p>
          <p className="font-ninja text-[12.5px] v2 text-ninja-muted truncate">{whereLine(enrollment, logs, model)}</p>
        </div>
        <ChevronRightIcon size={18} className="text-ninja-muted/60 flex-shrink-0" aria-hidden />
      </div>
    </motion.button>
  );
}

// The card, grown into a sheet: full screen on a phone, a centered card on
// desktop. Same layoutId as the card, so it morphs out of the tap instead of
// blinking on. Portalled to the body per the dialog tier.
function CoursePreviewModal({ enrollment, logs, childName, onClose }) {
  const p = enrollment.program;
  const isCreate = p === 'CREATE';
  const model = useTrackModel(enrollment, logs);
  const navigate = useNavigate();
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  const about = COURSE_ABOUT[p] || `${p} at Code Ninjas: projects, curriculum, and progress, logged session by session.`;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex sm:items-center sm:justify-center sm:p-6" role="dialog" aria-modal="true" aria-label={`About ${p}`}>
      <motion.span
        aria-hidden
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-[3px]"
        onClick={onClose}
      />
      <motion.div
        layoutId={`course-${p}`}
        transition={SNAP}
        className="relative w-full h-full sm:h-auto sm:max-w-xl bg-white sm:rounded-3xl sm:shadow-xl overflow-y-auto flex flex-col"
      >
        <button
          type="button"
          onClick={onClose}
          title="Close"
          aria-label="Close"
          className="absolute top-3.5 right-3.5 z-10 flex items-center justify-center w-9 h-9 rounded-full text-white bg-black/25 hover:bg-black/40 transition-colors"
        >
          <XIcon size={18} aria-hidden />
        </button>
        <Hero program={p}>
          <div className="flex items-center justify-between gap-3 py-1">
            <div className="min-w-0">
              <p className="font-ninja text-[12px] font-extrabold uppercase tracking-[0.08em] opacity-85">Course</p>
              <p className="font-ninja font-extrabold text-[28px] leading-tight mt-0.5 truncate">{p}</p>
              <p className="font-ninja text-[13px] opacity-85 mt-0.5 truncate">{whereLine(enrollment, logs, model)}</p>
            </div>
            <Emblem program={p} belt={isCreate ? enrollment.belt_level : null} size={64} />
          </div>
        </Hero>
        <div className="p-5 flex-1 flex flex-col gap-4">
          <p className="font-ninja text-[14.5px] leading-relaxed text-ninja-navy">{about}</p>
          <div className="mt-auto space-y-2">
            <button
              type="button"
              onClick={() => navigate(`/parent/courses/${enc(p)}`)}
              className="w-full font-ninja font-extrabold text-[15px] text-white bg-ninja-blue rounded-xl px-4 py-3 transition-transform duration-150 active:scale-[0.98]"
              style={{ transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)' }}
            >
              Open course
            </button>
            <p className="font-ninja text-xs text-ninja-muted text-center">
              {childName ? `${childName}'s progress and the full curriculum` : 'Progress and the full curriculum'}
            </p>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
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
        {backTo && <div className="mb-10 lg:mb-6"><BackChip to={backTo} label="Back to courses" /></div>}
        {/* Phone: the belt on the right of the title, as drawn. Desktop: the
            belt leads the title and the level pills take the right. */}
        <div className="flex items-center lg:items-start justify-between gap-5">
          <div className="flex items-center gap-4 min-w-0">
            <span className="hidden lg:inline-flex"><Emblem program="CREATE" belt={belt} size={72} /></span>
            <div className="min-w-0">
              <p className="hidden lg:block font-ninja text-[12px] font-extrabold opacity-85 truncate">CREATE · {childName}</p>
              <p className="font-ninja font-extrabold text-[36px] lg:text-[32px] leading-none mt-1 tracking-[-0.015em]">{belt} belt</p>
              <p className="font-ninja text-[13px] opacity-85 mt-2 truncate">
                {[`Level ${currentLevel}`, levels.length ? `${pos} of ${levels.length}` : null, next ? `earns ${next}` : null, sessions.length ? `${sessions.length} session${sessions.length === 1 ? '' : 's'}` : null].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
          <span className="lg:hidden flex-shrink-0"><Emblem program="CREATE" belt={belt} size={96} /></span>
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
  const [preview, setPreview] = useState(null); // program whose modal is up
  const pv = preview ? enrollments.find((e) => e.program === preview) : null;

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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {enrollments.map((e) => (
        <CourseCard key={e.id || e.program} enrollment={e} logs={logsFor(e.program)} onOpen={() => setPreview(e.program)} />
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
      <AnimatePresence>
        {pv && (
          <CoursePreviewModal
            enrollment={pv}
            logs={logsFor(pv.program)}
            childName={first}
            onClose={() => setPreview(null)}
          />
        )}
      </AnimatePresence>
    </ParentLayout>
  );
}
