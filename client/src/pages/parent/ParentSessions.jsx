import { Link } from 'react-router-dom';
import { CheckIcon, ChevronLeftIcon, PencilRulerIcon, UsersRoundIcon } from 'lucide-react';
import ParentLayout, { ChildSwitcher } from '../../components/layout/ParentLayout';
import { useParentPortal } from '../../context/ParentPortalContext';
import { PageHeader, Group, Row, Tile, StatusText } from '../../components/parent/ParentUI';
import BeltBadge from '../../components/ui/BeltBadge';
import { SkeletonList } from '../../components/ui/Skeleton';
import { activityFeed, fmtLongDay } from '../../lib/parentProgress';

// Every session and club visit, newest first, grouped by month.

export default function ParentSessions() {
  const { students, active, detail, detailLoading } = useParentPortal();
  const feed = activityFeed(detail);
  const months = [];
  for (const e of feed) {
    const d = new Date(String(e.session_date).split('T')[0] + 'T00:00:00');
    const key = Number.isNaN(d.getTime()) ? 'Undated' : d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    let m = months.find((x) => x.key === key);
    if (!m) { m = { key, items: [] }; months.push(m); }
    m.items.push(e);
  }

  const header = (
    <PageHeader
      eyebrow={<Link to="/parent/dashboard" className="inline-flex items-center gap-1 hover:underline"><ChevronLeftIcon size={14} strokeWidth={2.6} />Home</Link>}
      title="Sessions"
      right={<div className="lg:hidden"><ChildSwitcher size="sm" layoutId="parent-child-mobile" /></div>}
    >
      {active && <p className="text-ninja-muted font-ninja text-[13px] v2 mt-0.5">{active.full_name.split(' ')[0]} · {feed.length} in total</p>}
    </PageHeader>
  );

  if (students === null || (active && detailLoading && !detail)) {
    return <ParentLayout><div className="space-y-5">{header}<SkeletonList rows={6} label="Loading" /></div></ParentLayout>;
  }

  return (
    <ParentLayout>
      <div className="space-y-4 max-w-2xl">
        {header}
        {months.length === 0 && <p className="text-ninja-muted font-ninja text-sm px-1">No sessions logged yet.</p>}
        {months.map((m) => (
          <Group key={m.key} title={m.key}>
            {m.items.map((e, i) => (
              <Row
                key={`${e._type}-${i}`}
                first={i === 0}
                lead={e._type === 'club'
                  ? <Tile tint="rgb(126 34 206 / 0.12)"><UsersRoundIcon size={15} className="text-purple-700" /></Tile>
                  : e.status_at === 'Completed'
                    ? <Tile tint="rgb(34 197 94 / 0.14)"><CheckIcon size={15} className="text-green-700" strokeWidth={2.8} /></Tile>
                    : <Tile><PencilRulerIcon size={15} className="text-ninja-blue-ink" /></Tile>}
                title={e._type === 'club' ? e.club_name : (e.project_at || e.lesson_name || e.module_name || e.program)}
                subtitle={`${fmtLongDay(e.session_date)}${e._type === 'session' ? ` · ${[e.program, e.sub_program, e.module_name && e.project_at ? e.module_name : null].filter(Boolean).join(' · ')}` : ' · Club session'}`}
                trailing={e._type === 'club' ? <StatusText status="club" /> : (
                  <span className="flex items-center gap-2">
                    {e.belt_level_at && <BeltBadge belt={e.belt_level_at} sublevel={e.belt_sublevel_at} size="xs" />}
                    {e.status_at && <StatusText status={e.status_at} />}
                  </span>
                )}
              />
            ))}
          </Group>
        ))}
      </div>
    </ParentLayout>
  );
}
