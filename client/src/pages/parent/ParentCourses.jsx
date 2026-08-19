import { Link } from 'react-router-dom';
import { ChevronRightIcon, UsersRoundIcon } from 'lucide-react';
import ParentLayout, { ChildSwitcher } from '../../components/layout/ParentLayout';
import { useParentPortal } from '../../context/ParentPortalContext';
import { PageHeader, Hero, Gauge, SegmentBar, Tile } from '../../components/parent/ParentUI';
import BeltIcon from '../../components/ui/BeltIcon';
import { CARD } from '../../lib/surfaces';
import { SkeletonCards } from '../../components/ui/Skeleton';
import { beltHero, programHero, KIT_ORDER, KIT_SHORT } from '../../lib/programTheme';
import { PROGRAM_LOGOS, BELTS, getLevels } from '../../utils/beltConfig';
import { beltJourney, fmtDay } from '../../lib/parentProgress';

// One card per program the child is in, each with a hero in its own colour,
// and clubs on a quieter tint. Tap a card to open the course.

function CreateCard({ enrollment, logs }) {
  const belt = enrollment.belt_level;
  const level = Number(enrollment.belt_sublevel) || 1;
  const levels = getLevels(belt);
  const maxLevel = levels.length ? levels[levels.length - 1] : level;
  const m = beltHero(belt);
  const journey = beltJourney(enrollment, logs);
  const earnedCount = journey.filter((b) => b.state === 'earned' || b.state === 'current').length;
  return (
    <Link to="/parent/courses/CREATE" className={`${CARD} rounded-[26px] overflow-hidden block hover:border-ninja-blue/50 transition-colors`}>
      <div className="px-4 pt-3.5 pb-3 flex items-center gap-3">
        <Tile size={40} rounded={13} tint="linear-gradient(150deg, #3b8dff, #006add)">
          <img src={PROGRAM_LOGOS.CREATE} alt="" className="w-7 h-7 object-contain" />
        </Tile>
        <div className="min-w-0 flex-1">
          <p className="font-ninja font-extrabold text-[17px] text-ninja-navy">CREATE</p>
          <p className="font-ninja text-[12px] text-ninja-muted v2">Game coding{enrollment.last_session_date ? ` · last ${fmtDay(enrollment.last_session_date)}` : ''}</p>
        </div>
        <ChevronRightIcon size={18} className="text-ninja-muted/60" />
      </div>
      <div className="px-3">
        <Hero
          material={m}
          eyebrow={belt ? `${belt} belt` : 'CREATE'}
          title={belt ? <>Level {level} <span className="text-[15px] font-bold opacity-80">of {maxLevel}</span></> : 'Starting soon'}
          subtitle={enrollment.current_project ? `${enrollment.current_project}${enrollment.project_status ? ` · ${enrollment.project_status.toLowerCase()}` : ''}` : null}
          aside={belt ? <Gauge value={level} max={maxLevel} size={60} ink={m.onHero} ring={m.onHeroDim} face={m.face} /> : null}
          className="!rounded-[20px] !p-4"
        />
      </div>
      <div className="px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {BELTS.slice(0, 9).map((b) => {
            const j = journey.find((x) => x.name === b.name);
            const cur = j?.state === 'current';
            const ahead = j?.state === 'ahead';
            return <BeltIcon key={b.name} belt={b.name} size={cur ? 22 : 16} dimmed={ahead} style={cur ? { boxShadow: `0 0 0 2px #fff, 0 0 0 3px ${m.solid || '#22c55e'}`, borderRadius: 999 } : undefined} />;
          })}
        </div>
        <span className="font-ninja text-[12px] text-ninja-muted v2">{earnedCount} of {BELTS.length} belts</span>
      </div>
    </Link>
  );
}

function ProgramCard({ enrollment, logs }) {
  const p = enrollment.program;
  const m = programHero(p);
  const logo = PROGRAM_LOGOS[p];
  // A one-line "where they are", from what the enrolment already records.
  let where = [enrollment.last_sub_program, enrollment.last_module_name].filter(Boolean).join(' · ');
  let bar = null;
  if (p === 'Robotics Academy') {
    const kits = new Set(logs.map((l) => l.sub_program).filter((k) => KIT_ORDER.includes(k)));
    const idx = Math.max(-1, ...[...kits].map((k) => KIT_ORDER.indexOf(k)));
    if (idx >= 0) {
      where = `${KIT_ORDER[idx]}${enrollment.last_module_name ? ` · ${enrollment.last_module_name}` : ''}`;
      bar = <SegmentBar total={KIT_ORDER.length} done={idx} current fill="#1e3a8a" empty="rgb(26 46 74 / 0.1)" />;
    }
  }
  return (
    <Link to={`/parent/courses/${encodeURIComponent(p)}`} className={`${CARD} rounded-[26px] overflow-hidden block hover:border-ninja-blue/50 transition-colors`}>
      <div className="px-4 pt-3.5 pb-3 flex items-center gap-3">
        <Tile size={40} rounded={13} tint={m.background}>
          {logo ? <img src={logo} alt="" className="w-7 h-7 object-contain" /> : null}
        </Tile>
        <div className="min-w-0 flex-1">
          <p className="font-ninja font-extrabold text-[17px] text-ninja-navy">{p}</p>
          <p className="font-ninja text-[12px] text-ninja-muted v2">{enrollment.last_session_date ? `Last ${fmtDay(enrollment.last_session_date)}` : 'Just getting started'}</p>
        </div>
        <ChevronRightIcon size={18} className="text-ninja-muted/60" />
      </div>
      <div className="px-3">
        <Hero
          material={m}
          eyebrow={p === 'Robotics Academy' ? 'Current kit' : 'Now'}
          title={where || 'Getting started'}
          aside={logo ? <img src={logo} alt="" className="w-14 h-14 object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,0.4)]" /> : null}
          className="!rounded-[20px] !p-4 [&_p]:!text-[20px]"
        />
      </div>
      <div className="px-4 py-3.5 flex items-center gap-2">
        {bar ? <div className="flex-1">{bar}</div> : <span className="flex-1" />}
        {p === 'Robotics Academy' && bar && <span className="font-ninja text-[12px] text-ninja-muted v2 whitespace-nowrap">{KIT_ORDER.map((k) => KIT_SHORT[k]).join(' · ')}</span>}
      </div>
    </Link>
  );
}

export default function ParentCourses() {
  const { students, active, detail, detailLoading } = useParentPortal();
  const programs = detail?.programs || [];
  const logs = detail?.session_logs || [];
  const clubs = detail?.club_attendance || [];
  const clubNames = [...new Set(clubs.map((c) => c.club_name))];

  const header = (
    <PageHeader
      eyebrow={active ? `${active.full_name.split(' ')[0]} · ${programs.length} program${programs.length === 1 ? '' : 's'}${clubNames.length ? `, ${clubNames.length} club${clubNames.length === 1 ? '' : 's'}` : ''}` : ''}
      title="Courses"
      right={<div className="lg:hidden"><ChildSwitcher size="sm" layoutId="parent-child-mobile" /></div>}
    />
  );

  if (students === null || (active && detailLoading && !detail)) {
    return <ParentLayout wide><div className="space-y-5">{header}<SkeletonCards count={2} cols="lg:grid-cols-2" label="Loading" /></div></ParentLayout>;
  }

  const create = programs.find((p) => p.program === 'CREATE');
  const others = programs.filter((p) => p.program !== 'CREATE');

  return (
    <ParentLayout wide>
      <div className="space-y-4">
        {header}
        {programs.length === 0 && (
          <div className={`${CARD} rounded-[26px] p-6 text-center`}>
            <p className="text-ninja-navy font-ninja font-bold">Not enrolled in a program yet</p>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:items-start">
          {create && <CreateCard enrollment={create} logs={logs} />}
          {others.map((p) => <ProgramCard key={p.program} enrollment={p} logs={logs.filter((l) => l.program === p.program)} />)}
        </div>
        {clubNames.map((name) => {
          const mine = clubs.filter((c) => c.club_name === name);
          return (
            <div key={name} className="tint-lilac rounded-[22px] px-4 py-3.5 flex items-center gap-3">
              <Tile size={36} rounded={12} tint="rgb(255 255 255 / 0.8)"><UsersRoundIcon size={18} className="text-purple-700" /></Tile>
              <div className="min-w-0 flex-1">
                <p className="font-ninja font-extrabold text-[15px]" style={{ color: 'var(--tint-ink)' }}>{name}</p>
                <p className="font-ninja text-[12px] v2" style={{ color: 'var(--tint-ink-soft)' }}>{mine.length} session{mine.length === 1 ? '' : 's'} · last {fmtDay(mine[0]?.session_date)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </ParentLayout>
  );
}
