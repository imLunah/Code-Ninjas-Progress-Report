import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckIcon, ChevronLeftIcon, StarIcon } from 'lucide-react';
import ParentLayout from '../../components/layout/ParentLayout';
import { useParentPortal } from '../../context/ParentPortalContext';
import { Hero, Gauge, SegmentBar, Group, Row, Tile, StatusText } from '../../components/parent/ParentUI';
import BeltIcon from '../../components/ui/BeltIcon';
import ProgressVisuals from '../../components/parent/ProgressVisuals';
import { CARD } from '../../lib/surfaces';
import { SkeletonProfile } from '../../components/ui/Skeleton';
import { beltHero, programHero } from '../../lib/programTheme';
import { PROGRAM_LOGOS, BELTS, getLevels } from '../../utils/beltConfig';
import { beltJourney, levelProjects, levelStates, levelTitle, realSessions, fmtDay } from '../../lib/parentProgress';

// A course, opened. Leads with a hero in the course's own colour.
//
// CREATE is the star: the belt as the material, the level pills ON the hero,
// then the chosen level's real projects from the curriculum with what the log
// says about each, the other levels collapsed, and the whole belt road. Other
// programs keep the module and kit views the portal already had, under the
// same hero, because that derivation is program-specific and correct.

function BackChip({ to }) {
  return (
    <Link to={to} aria-label="Back to courses"
      className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/20 border border-white/35 backdrop-blur-md">
      <ChevronLeftIcon size={18} strokeWidth={2.6} />
    </Link>
  );
}

function ProjectRow({ p, first }) {
  const lead = p.status === 'done'
    ? <span className="w-[26px] h-[26px] rounded-full bg-green-500 inline-flex items-center justify-center"><CheckIcon size={13} className="text-white" strokeWidth={3.2} /></span>
    : p.status === 'working'
      ? <span className="w-[26px] h-[26px] rounded-full border-[2.5px] border-ninja-blue inline-flex items-center justify-center"><span className="w-2.5 h-2.5 rounded-full bg-ninja-blue" /></span>
      : p.kind === 'Adventure'
        ? <span className="w-[26px] h-[26px] rounded-full border-2 border-ninja-navy/20 inline-flex items-center justify-center"><StarIcon size={12} className="text-ninja-navy/40" /></span>
        : <span className="w-[26px] h-[26px] rounded-full border-2 border-ninja-navy/20" />;
  return (
    <Row
      first={first}
      lead={lead}
      dim={p.status === 'todo'}
      title={p.name}
      subtitle={p.kind === 'Adventure' ? (p.status === 'todo' ? 'Adventure · unlocks last' : `Adventure${p.date ? ` · ${fmtDay(p.date)}` : ''}`) : `${p.kind}${p.date ? ` · ${p.status === 'done' ? 'done' : 'last'} ${fmtDay(p.date)}` : ''}`}
      trailing={p.status !== 'todo' ? <StatusText status={p.status} /> : null}
    />
  );
}

function CreateDetail({ enrollment, logs }) {
  const belt = enrollment.belt_level;
  const currentLevel = Number(enrollment.belt_sublevel) || 1;
  const levels = getLevels(belt);
  const maxLevel = levels.length ? levels[levels.length - 1] : currentLevel;
  const [level, setLevel] = useState(currentLevel);
  const m = beltHero(belt);
  const journey = useMemo(() => beltJourney(enrollment, logs), [enrollment, logs]);
  const states = levelStates(belt, currentLevel);
  const projects = useMemo(() => levelProjects(belt, level, logs), [belt, level, logs]);
  const doneCount = projects.filter((p) => p.status === 'done').length;
  const idx = BELTS.findIndex((b) => b.name === belt);
  const next = idx >= 0 && idx < BELTS.length - 1 ? BELTS[idx + 1].name : null;
  const thisBelt = journey.find((b) => b.name === belt);
  const totalDone = realSessions(logs).filter((l) => l.belt_level_at === belt && l.status_at === 'Completed').length;
  const viewing = states.find((s) => s.level === level);
  const pillFor = (s) => {
    const active = s.level === level;
    if (active) return { background: '#ffffff', color: m.solid && m.color === '#ffffff' ? m.solid : '#1a2e4a', boxShadow: '0 4px 12px rgb(0 0 0 / 0.18)' };
    if (s.state === 'done') return { background: 'rgb(255 255 255 / 0.28)', border: '1px solid rgb(255 255 255 / 0.3)', color: m.color };
    return { background: 'rgb(255 255 255 / 0.12)', border: '1px solid rgb(255 255 255 / 0.2)', color: m.color, opacity: 0.85 };
  };

  return (
    <div className="space-y-4">
      <Hero
        material={m}
        size="page"
        eyebrow={<span className="flex items-center gap-3"><BackChip to="/parent/courses" /><span>CREATE</span></span>}
        title={belt ? `${belt} belt` : 'CREATE'}
        subtitle={belt ? `Level ${currentLevel} of ${maxLevel}${next ? ` · earns ${next}` : ''}${thisBelt?.first ? ` · started ${fmtDay(thisBelt.first)}` : ''}${totalDone ? ` · ${totalDone} projects done` : ''}` : 'Belt journey starting soon'}
        aside={belt ? (
          <div className="relative w-[92px] h-[92px]">
            <span className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(${m.color} 0deg ${Math.round((currentLevel / Math.max(1, maxLevel)) * 360)}deg, rgb(255 255 255 / 0.22) ${Math.round((currentLevel / Math.max(1, maxLevel)) * 360)}deg 360deg)` }} />
            <span className="absolute inset-[7px] rounded-full flex items-center justify-center" style={{ background: 'rgb(0 0 0 / 0.16)', boxShadow: 'inset 0 1px 0 rgb(255 255 255 / 0.4), 0 8px 20px rgb(0 0 0 / 0.25)' }}>
              <BeltIcon belt={belt} size={58} />
            </span>
          </div>
        ) : null}
        footer={belt && levels.length > 0 ? (
          <div className="flex gap-1.5" role="tablist" aria-label="Levels">
            {states.map((s) => (
              <button key={s.level} type="button" role="tab" aria-selected={s.level === level} onClick={() => setLevel(s.level)}
                className="flex-1 min-w-0 rounded-xl py-2 font-ninja font-extrabold text-[13px] inline-flex items-center justify-center gap-1"
                style={pillFor(s)}>
                {s.state === 'done' && <CheckIcon size={12} strokeWidth={3.2} />}{s.level}
              </button>
            ))}
          </div>
        ) : null}
      />

      {belt && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4 lg:items-start">
          <div className="space-y-4">
            <section className="tint-green rounded-[24px] p-4 pb-2 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-ninja text-[12px] font-extrabold uppercase tracking-[0.08em]" style={{ color: '#15803d' }}>
                    Level {level}{viewing?.state === 'current' ? ' · now' : viewing?.state === 'done' ? ' · done' : ' · ahead'}
                  </p>
                  <p className="font-ninja font-extrabold text-[20px] leading-tight tracking-[-0.02em] text-ninja-navy">{levelTitle(belt, level)}</p>
                  <p className="font-ninja text-[12px] v2 mt-0.5" style={{ color: 'rgb(20 83 45 / 0.75)' }}>{doneCount} of {projects.length} projects</p>
                </div>
                <Gauge value={doneCount} max={projects.length} size={48} ink="#22c55e" ring="rgb(34 197 94 / 0.2)" face="rgb(255 255 255 / 0.85)" />
              </div>
              <div className="tint-inset rounded-2xl overflow-hidden">
                {projects.map((p, i) => <ProjectRow key={p.name} p={p} first={i === 0} />)}
                {projects.length === 0 && <p className="px-4 py-3 text-ninja-muted font-ninja text-sm">No projects listed for this level.</p>}
              </div>
            </section>

            <Group title="All levels">
              {states.map((s, i) => (
                <Row key={s.level} first={i === 0}
                  onClick={() => setLevel(s.level)}
                  dim={s.state === 'ahead'}
                  lead={<Tile size={30} tint={s.state === 'current' ? '#22c55e' : s.state === 'done' ? 'rgb(34 197 94 / 0.16)' : 'rgb(26 46 74 / 0.06)'}><span className={`font-ninja font-black text-[12px] ${s.state === 'current' ? 'text-white' : s.state === 'done' ? 'text-green-700' : 'text-ninja-navy/60'}`}>{s.level}</span></Tile>}
                  title={levelTitle(belt, s.level)}
                  subtitle={`${s.projectCount} projects${s.state === 'current' ? ' · now' : ''}${s.level === maxLevel && next ? ` · earns ${next}` : ''}`}
                />
              ))}
            </Group>
          </div>

          <div className="space-y-4">
            <Group title="Belt road">
              {journey.slice(0, 9).map((b, i) => (
                <Row key={b.name} first={i === 0} dim={b.state === 'ahead'}
                  lead={<BeltIcon belt={b.name} size={b.state === 'current' ? 30 : 26} dimmed={b.state === 'ahead'} style={b.state === 'current' ? { boxShadow: `0 0 0 2px #fff, 0 0 0 3px ${m.solid || '#22c55e'}`, borderRadius: 999 } : undefined} />}
                  title={<>{b.name}{b.state === 'current' && <span className="ml-1.5 align-middle text-[10px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: 'rgb(34 197 94 / 0.16)', color: '#15803d' }}>Now</span>}</>}
                  subtitle={b.state === 'ahead' ? `${b.levels} level${b.levels === 1 ? '' : 's'}` : b.state === 'current' ? `Level ${currentLevel} of ${maxLevel}` : `${b.levels} levels${b.first ? ` · started ${fmtDay(b.first)}` : ''}${b.sessions ? ` · ${b.sessions} sessions` : ''}`}
                />
              ))}
              <div className="px-4 py-3 border-t border-ninja-navy/[0.08] flex items-center justify-between">
                <span className="font-ninja text-[12px] text-ninja-muted v2">After Black: bonus tracks</span>
                <span className="flex gap-1.5">{BELTS.slice(9).map((b) => <BeltIcon key={b.name} belt={b.name} size={16} dimmed />)}</span>
              </div>
            </Group>
          </div>
        </div>
      )}
    </div>
  );
}

function ProgramDetail({ enrollment, logs }) {
  const p = enrollment.program;
  const m = programHero(p);
  const logo = PROGRAM_LOGOS[p];
  const sessions = realSessions(logs).length;
  return (
    <div className="space-y-4">
      <Hero
        material={m}
        size="page"
        eyebrow={<span className="flex items-center gap-3"><BackChip to="/parent/courses" /><span>Program</span></span>}
        title={p}
        subtitle={[enrollment.last_sub_program, enrollment.last_module_name].filter(Boolean).join(' · ') || (sessions ? `${sessions} sessions` : 'Just getting started')}
        aside={logo ? <span className="w-[88px] h-[88px] rounded-[26px] inline-flex items-center justify-center" style={{ background: 'rgb(255 255 255 / 0.14)', border: '1px solid rgb(255 255 255 / 0.28)', boxShadow: 'inset 0 1px 0 rgb(255 255 255 / 0.4)' }}><img src={logo} alt="" className="w-16 h-16 object-contain" /></span> : null}
      />
      <ProgressVisuals programs={[enrollment]} sessionLogs={logs} />
    </div>
  );
}

export default function ParentCourseDetail() {
  const { program } = useParams();
  const navigate = useNavigate();
  const { students, detail, detailLoading } = useParentPortal();
  const name = decodeURIComponent(program || '');
  const enrollment = detail?.programs?.find((p) => p.program === name);
  const logs = (detail?.session_logs || []).filter((l) => l.program === name);

  if (students === null || (detailLoading && !detail)) {
    return <ParentLayout wide><SkeletonProfile label="Loading course" /></ParentLayout>;
  }
  if (!enrollment) {
    return (
      <ParentLayout>
        <div className={`${CARD} p-8 text-center space-y-3`}>
          <p className="text-ninja-navy font-ninja font-bold">Not enrolled in {name || 'that program'}.</p>
          <button type="button" onClick={() => navigate('/parent/courses')} className="font-ninja text-sm font-extrabold text-ninja-blue-ink hover:underline">Back to courses</button>
        </div>
      </ParentLayout>
    );
  }
  return (
    <ParentLayout wide>
      {name === 'CREATE' ? <CreateDetail enrollment={enrollment} logs={logs} /> : <ProgramDetail enrollment={enrollment} logs={logs} />}
    </ParentLayout>
  );
}
