import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import ParentLayout, { ChildSwitcher } from '../../components/layout/ParentLayout';
import { useParentAuth } from '../../context/ParentAuthContext';
import { useParentPortal } from '../../context/ParentPortalContext';
import { PageTitle, ProgramMark, Group, Row, StatusText, MoreLink } from '../../components/parent/ParentUI';
import ProgressVisuals from '../../components/parent/ProgressVisuals';
import { Pin, MARKDOWN_COMPONENTS } from '../../components/shared/PinnedNote';
import LazyMarkdownEditor from '../../components/shared/LazyMarkdownEditor';
import { FLAT } from '../../lib/surfaces';
import { SkeletonProfile } from '../../components/ui/Skeleton';
import { activityFeed, calcAge, fmtLongDay } from '../../lib/parentProgress';

// The full profile: everything about one child on one page.
//
// Home and Courses are the glance; this is the record. Who they are and what
// they are in, the note the parent keeps for the senseis (the one thing in the
// portal a parent writes rather than reads), the progress visuals, and every
// session grouped by month. The URL names the child, so the link on a Home
// card lands here for that child even when another is selected.

const INITIAL_MONTHS = 3;

function whereLine(p) {
  if (p.program === 'CREATE') return p.belt_level ? `${p.belt_level} belt${p.belt_sublevel ? ` · Level ${p.belt_sublevel}` : ''}` : 'Just getting started';
  return [p.last_sub_program, p.last_module_name].filter(Boolean).join(' · ') || 'Just getting started';
}

function monthKey(dateStr) {
  const d = new Date(String(dateStr).split('T')[0] + 'T00:00:00');
  return Number.isNaN(d.getTime()) ? 'Undated' : d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function NoteCard({ child, text, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setEditing(false); setDraft(text); }, [child?.id, text]);

  const handleSave = async () => {
    setSaving(true); setError('');
    try { await onSave(draft); setEditing(false); }
    catch { setError('Could not save the note. Try again.'); }
    finally { setSaving(false); }
  };

  const first = child?.full_name?.split(' ')[0];
  return (
    <section className="tint-amber rounded-[22px] px-5 py-4">
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2" style={{ color: 'var(--tint-ink)' }}>
          <Pin className="w-4 h-4 -rotate-12" />
          <h2 className="font-ninja font-extrabold text-[15px]">Note for Senseis</h2>
        </div>
        {!editing && (
          <button type="button" onClick={() => { setDraft(text); setEditing(true); }}
            className="font-ninja text-xs font-extrabold hover:underline" style={{ color: 'var(--tint-ink)' }}>
            {text.trim() ? 'Edit' : 'Add note'}
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2.5">
          <LazyMarkdownEditor value={draft} onChange={setDraft}
            placeholder="Allergies, pickup notes, learning style, or anything else the senseis should know." />
          {error && <p className="text-ninja-red font-ninja text-xs">{error}</p>}
          <div className="flex items-center gap-1">
            <button type="button" onClick={handleSave} disabled={saving}
              className="font-ninja text-xs font-extrabold bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-1.5 rounded-lg transition-colors disabled:opacity-50 active:scale-95">
              {saving ? 'Saving…' : 'Save note'}
            </button>
            <button type="button" onClick={() => { setEditing(false); setDraft(text); }}
              className="font-ninja text-xs font-extrabold px-3 py-1.5" style={{ color: 'var(--tint-ink)' }}>
              Cancel
            </button>
          </div>
        </div>
      ) : text.trim() ? (
        <div className="font-ninja text-sm leading-relaxed text-ninja-navy">
          {/* MARKDOWN_COMPONENTS keeps img: () => null. Parent-authored text is
              rendered in staff context; a remote image would be a tracking pixel. */}
          <ReactMarkdown components={MARKDOWN_COMPONENTS} urlTransform={(url) => (/^(https?:|mailto:)/i.test(url) ? url : '')}>
            {text}
          </ReactMarkdown>
        </div>
      ) : (
        <p className="font-ninja text-sm leading-relaxed" style={{ color: 'var(--tint-ink-soft)' }}>
          Nothing pinned yet. Anything you write here shows on {first}'s profile for every sensei at the center.
        </p>
      )}
    </section>
  );
}

export default function ParentProfile() {
  const { id } = useParams();
  const { parent } = useParentAuth();
  const { students, setActiveId, setViewAll, detailFor, loadDetail, detailLoading, saveNote } = useParentPortal();
  const target = Number(id);
  const child = (students || []).find((s) => s.id === target) || null;
  const detail = detailFor(target);
  const [monthsShown, setMonthsShown] = useState(INITIAL_MONTHS);

  // Landing here IS choosing this child, so the switchers agree with the page.
  useEffect(() => {
    if (child) { setActiveId(child.id); setViewAll(false); }
  }, [child?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (child) loadDetail(child.id); }, [child?.id, loadDetail]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setMonthsShown(INITIAL_MONTHS); }, [target]);

  const feed = useMemo(() => activityFeed(detail), [detail]);
  const months = useMemo(() => {
    const out = [];
    const idx = new Map();
    for (const item of feed) {
      const k = monthKey(item.session_date);
      if (!idx.has(k)) { idx.set(k, out.length); out.push({ key: k, items: [] }); }
      out[idx.get(k)].items.push(item);
    }
    return out;
  }, [feed]);

  const switcher = <ChildSwitcher layoutId="parent-child-desktop" />;

  if (students === null || (child && !detail && detailLoading)) {
    return <ParentLayout switcher={switcher}><SkeletonProfile label="Loading profile" /></ParentLayout>;
  }
  if (!child) {
    return (
      <ParentLayout switcher={switcher}>
        <div className={`${FLAT} p-8 text-center space-y-2`}>
          <p className="text-ninja-navy font-ninja font-bold">That ninja is not on this account.</p>
          <MoreLink to="/parent/dashboard">Back to Home</MoreLink>
        </div>
      </ParentLayout>
    );
  }

  const age = calcAge(child.birthday);
  const since = child.created_at ? new Date(child.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : null;
  const programs = detail?.programs || child.programs || [];
  const first = child.full_name.split(' ')[0];

  return (
    <ParentLayout switcher={switcher}>
      <div className="space-y-4 lg:space-y-5">
        <PageTitle eyebrow="Full profile" title={child.full_name} />
        <div className="lg:hidden"><ChildSwitcher layoutId="parent-child-mobile" /></div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
          <Group title="About">
            <Row first title={[age != null && age >= 3 ? `Age ${age}` : null, since ? `Ninja since ${since}` : null].filter(Boolean).join(' · ') || 'Ninja'} subtitle={parent?.centerName ? `Code Ninjas ${parent.centerName}` : undefined} />
            {programs.map((p) => (
              <Row key={p.id || p.program} lead={<ProgramMark program={p.program} size={32} />} title={p.program} subtitle={whereLine(p)} to={`/parent/courses/${encodeURIComponent(p.program)}`} />
            ))}
            {programs.length === 0 && <Row title="Not enrolled in a program yet" />}
          </Group>
          <NoteCard child={child} text={detail?.special_instructions || ''} onSave={(text) => saveNote(child.id, text)} />
        </div>

        {detail && programs.length > 0 && (
          <ProgressVisuals programs={programs} sessionLogs={detail.session_logs || []} />
        )}

        <div className="space-y-3">
          <PageTitle title="Sessions" eyebrow={feed.length ? `${feed.length} in all` : ''} className="pt-2" />
          {months.length === 0 && (
            <div className={`${FLAT} p-8 text-center`}><p className="text-ninja-muted font-ninja text-sm">Sessions show up here as soon as a sensei logs one for {first}.</p></div>
          )}
          {months.slice(0, monthsShown).map((m) => (
            <Group key={m.key} title={m.key}>
              {m.items.map((it, i) => it._type === 'club' ? (
                <Row key={`c${it.session_date}${it.club_name}${i}`} first={i === 0} title={it.club_name} subtitle={`Club · ${fmtLongDay(it.session_date)}`} trailing={<StatusText status="club" />} />
              ) : (
                <Row key={`s${it.session_date}${i}`} first={i === 0}
                  title={it.project_at || it.lesson_name || it.module_name || it.sub_program || `${it.program} session`}
                  subtitle={[it.program, it.program === 'CREATE' && it.belt_level_at ? `${it.belt_level_at} belt${it.belt_sublevel_at ? `, level ${it.belt_sublevel_at}` : ''}` : [it.sub_program, it.module_name].filter(Boolean).join(' · ') || null, fmtLongDay(it.session_date), it.sensei_name ? `Sensei ${String(it.sensei_name).split(' ')[0]}` : null].filter(Boolean).join(' · ')}
                  trailing={it.status_at ? <StatusText status={it.status_at} /> : null} />
              ))}
            </Group>
          ))}
          {months.length > monthsShown && (
            <button type="button" onClick={() => setMonthsShown((n) => n + INITIAL_MONTHS)}
              className={`${FLAT} w-full py-3 font-ninja text-[13px] font-extrabold text-ninja-blue-ink hover:bg-ninja-navy/[0.03] active:scale-[0.99] transition-colors`}>
              Show earlier months
            </button>
          )}
        </div>
      </div>
    </ParentLayout>
  );
}
