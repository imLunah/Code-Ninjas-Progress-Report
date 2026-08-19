import { Link, useNavigate } from 'react-router-dom';
import { CheckIcon, PencilRulerIcon, UsersRoundIcon } from 'lucide-react';
import ParentLayout, { ChildSwitcher } from '../../components/layout/ParentLayout';
import { useParentAuth } from '../../context/ParentAuthContext';
import { useParentPortal } from '../../context/ParentPortalContext';
import { PageHeader, Hero, Gauge, SegmentBar, Group, Row, Tile, Stat, StatusText } from '../../components/parent/ParentUI';
import BeltIcon from '../../components/ui/BeltIcon';
import { CARD } from '../../lib/surfaces';
import { SkeletonCards } from '../../components/ui/Skeleton';
import { beltHero, programHero } from '../../lib/programTheme';
import { PROGRAM_LOGOS, getLevels, BELTS } from '../../utils/beltConfig';
import { beltJourney, realSessions, activityFeed, fmtDay, calcAge } from '../../lib/parentProgress';

// The parent's home: one child, where they stand, what happened lately.
//
// Hero first, in the colour of the belt (or the program, for a child not in
// CREATE), then Today, two stats, and Recent as a grouped list. On desktop the
// same pieces sit in two columns. Nothing here is a chart a parent will not
// read; every number is one they would say out loud.

const todayLabel = () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
const fmtTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

function BeltHeroCard({ enrollment, logs, size = 'card' }) {
  const belt = enrollment.belt_level;
  const level = Number(enrollment.belt_sublevel) || 1;
  const levels = getLevels(belt);
  const maxLevel = levels.length ? levels[levels.length - 1] : level;
  const idx = BELTS.findIndex((b) => b.name === belt);
  const next = idx >= 0 && idx < BELTS.length - 1 ? BELTS[idx + 1].name : null;
  const m = beltHero(belt);
  const done = levels.filter((lv) => lv < level).length;
  const project = enrollment.current_project ? `${enrollment.current_project}${enrollment.project_status ? ` · ${enrollment.project_status.toLowerCase()}` : ''}` : null;
  return (
    <Link to="/parent/courses/CREATE" className="block" aria-label={`${belt} belt, level ${level} of ${maxLevel}. Open the belt journey.`}>
      <Hero
        material={m}
        size={size}
        eyebrow={belt ? `${belt} belt` : 'CREATE'}
        title={belt ? <>Level {level} <span className="text-[18px] font-bold opacity-80">of {maxLevel}</span></> : 'Belt journey starting soon'}
        subtitle={belt ? [project, next ? `${Math.max(0, levels.length - done - 1)} to ${next}` : null].filter(Boolean).join(' · ') : null}
        aside={belt ? (
          <div className="flex items-center gap-3">
            <BeltIcon belt={belt} size={size === 'page' ? 64 : 48} style={{ filter: 'drop-shadow(0 6px 14px rgb(0 0 0 / 0.3))' }} />
            <Gauge value={level} max={maxLevel} size={size === 'page' ? 84 : 66} ink={m.color} face="rgb(0 0 0 / 0.16)" />
          </div>
        ) : null}
        footer={belt ? <SegmentBar total={levels.length} done={done} current fill={m.color} empty={m.color === '#ffffff' ? 'rgb(255 255 255 / 0.22)' : 'rgb(0 0 0 / 0.14)'} /> : null}
      />
    </Link>
  );
}

function ProgramHeroCard({ enrollment }) {
  const m = programHero(enrollment.program);
  const logo = PROGRAM_LOGOS[enrollment.program];
  return (
    <Link to={`/parent/courses/${encodeURIComponent(enrollment.program)}`} className="block">
      <Hero
        material={m}
        eyebrow="Current program"
        title={enrollment.program}
        subtitle={[enrollment.last_sub_program, enrollment.last_module_name].filter(Boolean).join(' · ') || (enrollment.last_session_date ? `Last ${fmtDay(enrollment.last_session_date)}` : 'Just getting started')}
        aside={logo ? <img src={logo} alt="" className="w-16 h-16 object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,0.4)]" /> : null}
      />
    </Link>
  );
}

export default function ParentHome() {
  const { parent } = useParentAuth();
  const portal = useParentPortal();
  const navigate = useNavigate();
  const { students, active, detail, detailLoading, listError } = portal;

  const create = detail?.programs?.find((p) => p.program === 'CREATE');
  const primary = create || detail?.programs?.[0] || null;
  const logs = detail?.session_logs || [];
  const sessions = realSessions(logs).length + (detail?.club_attendance?.length || 0);
  const journey = create ? beltJourney(create, logs) : [];
  const earned = journey.filter((b) => b.state === 'earned' || b.state === 'current');
  const feed = activityFeed(detail).slice(0, 5);
  const today = detail?.today_checkins || [];
  const monthCount = realSessions(logs).filter((l) => {
    const d = new Date(String(l.session_date).split('T')[0] + 'T00:00:00'); const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).length;

  const header = (
    <PageHeader
      eyebrow={todayLabel()}
      title={active ? active.full_name.split(' ')[0] : parent?.parentName ? `${greeting()}, ${parent.parentName.split(' ')[0]}` : 'My ninjas'}
      right={<div className="lg:hidden"><ChildSwitcher size="sm" layoutId="parent-child-mobile" /></div>}
    >
      {active && (
        <p className="text-ninja-muted font-ninja text-[13px] v2 mt-0.5">
          {[calcAge(active.birthday) !== null ? `Age ${calcAge(active.birthday)}` : null, (active.programs || []).map((p) => p.program).join(' · ') || null].filter(Boolean).join(' · ')}
        </p>
      )}
    </PageHeader>
  );

  if (students === null || (active && detailLoading && !detail)) {
    return (
      <ParentLayout wide>
        <div className="space-y-5">{header}<SkeletonCards count={3} cols="sm:grid-cols-2 lg:grid-cols-3" label="Loading" /></div>
      </ParentLayout>
    );
  }

  if (listError) {
    return <ParentLayout><p className="text-ninja-red font-ninja text-center py-12">{listError}</p></ParentLayout>;
  }

  if (!students.length) {
    return (
      <ParentLayout>
        <div className="space-y-5">{header}
          <div className={`${CARD} p-8 text-center`}>
            <p className="text-ninja-navy font-ninja font-bold">No ninjas found for this email at {parent?.centerName || 'this center'}.</p>
            <p className="text-ninja-muted font-ninja text-sm mt-1">Ask the front desk to check the email on file, and that you signed in with the right center code.</p>
          </div>
        </div>
      </ParentLayout>
    );
  }

  const hero = primary ? (create ? <BeltHeroCard enrollment={create} logs={logs} /> : <ProgramHeroCard enrollment={primary} />) : (
    <div className={`${CARD} rounded-[26px] p-6 text-center`}>
      <p className="text-ninja-navy font-ninja font-bold">Not enrolled in a program yet</p>
      <p className="text-ninja-muted font-ninja text-sm mt-1">Once the center enrols {active?.full_name.split(' ')[0]}, their progress appears here.</p>
    </div>
  );

  const todayCard = (
    <Group tint="blue" title={null}>
      <div className="px-4 pt-4 pb-3 grid grid-cols-[92px_minmax(0,1fr)] gap-3">
        <div className="flex flex-col justify-between">
          <span className="font-ninja font-extrabold text-[24px] leading-none tracking-[-0.02em] text-ninja-navy">Today</span>
          <span className="font-ninja text-[12px] v2 text-ninja-blue-ink opacity-90">{today.length ? `${today.length} check-in${today.length > 1 ? 's' : ''}` : 'No check-in yet'}</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {today.length === 0 && (
            <div className="tint-inset rounded-xl px-3 py-2.5">
              <p className="font-ninja font-extrabold text-[13px] text-ninja-navy">Nothing logged today</p>
              <p className="font-ninja text-[11px] text-ninja-muted v2">{primary?.last_session_date ? `Last session ${fmtDay(primary.last_session_date)}` : 'Check-ins show up here as they happen'}</p>
            </div>
          )}
          {today.map((t, i) => (
            <div key={i} className="tint-inset rounded-xl px-3 py-2.5 flex items-center gap-2.5">
              <Tile size={26} rounded={8}>{PROGRAM_LOGOS[t.program] ? <img src={PROGRAM_LOGOS[t.program]} alt="" className="w-5 h-5 object-contain" /> : <CheckIcon size={14} className="text-ninja-blue-ink" />}</Tile>
              <div className="min-w-0 flex-1">
                <p className="font-ninja font-extrabold text-[13px] text-ninja-navy truncate">{t.program || 'Checked in'}</p>
                <p className="font-ninja text-[11px] text-ninja-muted v2">Checked in {fmtTime(t.created_at)}{t.completed ? ' · session logged' : ''}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Group>
  );

  const stats = (
    <div className="grid grid-cols-2 gap-3">
      <Stat label="Sessions" value={sessions} note={monthCount ? `+${monthCount} this month` : null} tint="lilac" />
      {create ? (
        <div className={`${CARD} rounded-[22px] p-4 flex flex-col justify-between gap-1.5 min-h-[96px]`}>
          <p className="text-ninja-muted font-ninja text-[12px] v2">Belts earned</p>
          <div className="flex items-center gap-1.5">
            {earned.slice(-5).map((b) => (
              <BeltIcon key={b.name} belt={b.name} size={b.state === 'current' ? 26 : 20} />
            ))}
            {earned.length === 0 && <span className="text-ninja-navy font-ninja font-extrabold text-[22px]">0</span>}
          </div>
          <p className="font-ninja text-[12px] font-extrabold" style={{ color: '#15803d' }}>
            {journey.find((b) => b.state === 'ahead') ? `${journey.find((b) => b.state === 'ahead').name} is next` : 'At the top'}
          </p>
        </div>
      ) : (
        <Stat label="Programs" value={(detail?.programs || []).length} note={(detail?.programs || []).map((p) => p.program).join(', ')} noteColor="rgb(var(--ninja-muted))" />
      )}
    </div>
  );

  const recent = (
    <Group title="Recent" action={<Link to="/parent/sessions" className="font-ninja text-[13px] font-extrabold text-ninja-blue-ink hover:underline">All {realSessions(logs).length + (detail?.club_attendance?.length || 0)}</Link>}>
      {feed.length === 0 && <p className="px-4 pb-4 pt-1 text-ninja-muted font-ninja text-sm">No sessions logged yet.</p>}
      {feed.map((e, i) => (
        <Row
          key={`${e._type}-${i}`}
          first={i === 0}
          lead={e._type === 'club'
            ? <Tile tint="rgb(126 34 206 / 0.12)"><UsersRoundIcon size={15} className="text-purple-700" /></Tile>
            : e.status_at === 'Completed'
              ? <Tile tint="rgb(34 197 94 / 0.14)"><CheckIcon size={15} className="text-green-700" strokeWidth={2.8} /></Tile>
              : <Tile><PencilRulerIcon size={15} className="text-ninja-blue-ink" /></Tile>}
          title={e._type === 'club' ? e.club_name : (e.project_at || e.lesson_name || e.module_name || e.program)}
          subtitle={`${fmtDay(e.session_date)}${e._type === 'session' ? ` · ${[e.belt_level_at ? `${e.belt_level_at} belt` : e.program, e.sub_program].filter(Boolean).join(' · ')}` : ' · Club session'}`}
          trailing={<StatusText status={e._type === 'club' ? 'club' : (e.status_at || 'Started')} />}
        />
      ))}
    </Group>
  );

  const note = detail && (
    <button type="button" onClick={() => navigate('/parent/note')} className="tint-amber rounded-[22px] px-4 py-3.5 text-left w-full">
      <div className="flex items-center justify-between">
        <span className="font-ninja text-[12px] v2 uppercase tracking-[0.06em]" style={{ color: '#b45309' }}>Note for Senseis</span>
        <span className="font-ninja text-[12px] font-extrabold" style={{ color: '#b45309' }}>{detail.special_instructions?.trim() ? 'Edit' : 'Add'}</span>
      </div>
      <p className="font-ninja text-[14px] text-ninja-navy mt-1 line-clamp-2">
        {detail.special_instructions?.trim() || 'Allergies, pickup notes, anything the senseis should know.'}
      </p>
    </button>
  );

  return (
    <ParentLayout wide>
      <div className="space-y-4">
        {header}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-4 lg:items-start">
          <div className="space-y-4">
            {hero}
            <div className="lg:hidden space-y-4">{todayCard}{stats}</div>
            {recent}
          </div>
          <div className="hidden lg:block space-y-4">
            {todayCard}
            {stats}
            {note}
          </div>
          <div className="lg:hidden">{note}</div>
        </div>
      </div>
    </ParentLayout>
  );
}
