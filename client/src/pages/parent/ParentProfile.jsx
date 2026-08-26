import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import ParentLayout, { ChildSwitcher } from '../../components/layout/ParentLayout';
import { useParentPortal } from '../../context/ParentPortalContext';
import { PageTitle, Row, StatusText, MoreLink } from '../../components/parent/ParentUI';
import ProgressVisuals from '../../components/parent/ProgressVisuals';
import { Pin } from '../../components/shared/PinnedNote';
import LazyMarkdownEditor from '../../components/shared/LazyMarkdownEditor';
import { FLAT } from '../../lib/surfaces';
import { SkeletonProfile } from '../../components/ui/Skeleton';
import Modal from '../../components/ui/Modal';
import { activityFeed, fmtLongDay } from '../../lib/parentProgress';

// The full profile: everything about one child on one page.
//
// Home and Courses are the glance; this is the record: the note the parent
// keeps for the senseis (the one thing in the portal a parent writes rather
// than reads), the progress visuals, and every session grouped by month. Who
// they are and what they are in lives on Home and Courses, so the About card
// that used to sit here was the third printing of it. The URL names the child,
// so the link on a Home card lands here for that child even when another is
// selected.

function monthKey(dateStr) {
  const d = new Date(String(dateStr).split('T')[0] + 'T00:00:00');
  return Number.isNaN(d.getTime()) ? 'Undated' : d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// The note a parent keeps for the senseis, behind a pin in the page title.
//
// It used to be a card of its own, and after the About card came off it ran
// the full width of the page for the sake of one line somebody writes once a
// term. A note is a thing you go and change, not a thing you read on arrival,
// so it is an icon that opens the box you type in. It rests quiet at every
// state and takes the portal's blue on hover, because a colour that is always
// on is decoration rather than an answer — amber was tried first and read as a
// warning sitting beside the name. Whether a note EXISTS is said by the pin
// itself, filled when there is one and hollow when there is not, so the glance
// the page owes it survives without the button being lit all day.
function NoteButton({ child, text, onSave }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(text);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setOpen(false); setDraft(text); }, [child?.id, text]);

  const has = Boolean(text.trim());
  const first = child?.full_name?.split(' ')[0];

  const close = () => { setOpen(false); setDraft(text); setError(''); };
  const handleSave = async () => {
    setSaving(true); setError('');
    try { await onSave(draft); setOpen(false); }
    catch { setError('Could not save the note. Try again.'); }
    finally { setSaving(false); }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => { setDraft(text); setError(''); setOpen(true); }}
        title="Note for Senseis"
        aria-label={has ? 'Edit the note for senseis' : 'Add a note for senseis'}
        className="flex items-center justify-center w-10 h-10 rounded-full transition-colors bg-white border border-ninja-border text-ninja-muted hover:text-ninja-blue hover:border-ninja-blue/40"
      >
        <Pin className="w-[18px] h-[18px] -rotate-12" fill={has ? 'currentColor' : 'none'} />
      </button>

      <Modal isOpen={open} onClose={close} title="Note for Senseis">
        <div className="space-y-3">
          <p className="font-ninja text-[13px] text-ninja-muted">
            Allergies, pickup notes, learning style, or anything else the senseis should know.
          </p>
          <LazyMarkdownEditor value={draft} onChange={setDraft}
            placeholder={`Anything the senseis should know about ${first}.`} />
          {error && <p className="text-ninja-red font-ninja text-xs">{error}</p>}
          <div className="flex items-center gap-1">
            <button type="button" onClick={handleSave} disabled={saving}
              className="font-ninja text-xs font-extrabold bg-ninja-blue hover:bg-ninja-blue/90 text-white px-3.5 py-1.5 rounded-lg transition-colors disabled:opacity-50 active:scale-95">
              {saving ? 'Saving…' : 'Save note'}
            </button>
            <button type="button" onClick={close}
              className="font-ninja text-xs font-extrabold px-3 py-1.5 text-ninja-muted hover:text-ninja-navy transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default function ParentProfile() {
  const { id } = useParams();
  const { students, setActiveId, setViewAll, detailFor, loadDetail, detailLoading, saveNote } = useParentPortal();
  const target = Number(id);
  const child = (students || []).find((s) => s.id === target) || null;
  const detail = detailFor(target);

  // Landing here IS choosing this child, so the switchers agree with the page.
  useEffect(() => {
    if (child) { setActiveId(child.id); setViewAll(false); }
  }, [child?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (child) loadDetail(child.id); }, [child?.id, loadDetail]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const programs = detail?.programs || child.programs || [];
  const first = child.full_name.split(' ')[0];

  return (
    <ParentLayout switcher={switcher}>
      <div className="space-y-4 lg:space-y-5">
        <PageTitle eyebrow="Full profile" title={child.full_name}
          right={<NoteButton child={child} text={detail?.special_instructions || ''} onSave={(text) => saveNote(child.id, text)} />} />
        <div className="lg:hidden"><ChildSwitcher layoutId="parent-child-mobile" /></div>

        {detail && programs.length > 0 && (
          <ProgressVisuals programs={programs} sessionLogs={detail.session_logs || []} childName={first} />
        )}

        <div className="space-y-3">
          <PageTitle title="Sessions" eyebrow={feed.length ? `${feed.length} in all` : ''} className="pt-2" />
          {months.length === 0 && (
            <div className={`${FLAT} p-8 text-center`}><p className="text-ninja-muted font-ninja text-sm">Sessions show up here as soon as a sensei logs one for {first}.</p></div>
          )}
          {months.length > 0 && (
            <div className={`${FLAT} overflow-hidden`}>
              <div className="max-h-[min(58vh,520px)] overflow-y-auto overscroll-contain">
                {months.map((m, mi) => (
                  <div key={m.key} className={mi ? 'border-t border-ninja-navy/[0.08]' : ''}>
                    <p className="sticky top-0 z-10 bg-white px-4 pt-3.5 pb-1.5 font-ninja text-[11px] font-extrabold uppercase tracking-[0.08em] text-ninja-muted">{m.key}</p>
                    {m.items.map((it, i) => it._type === 'club' ? (
                      <Row key={`c${it.session_date}${it.club_name}${i}`} first={i === 0} title={it.club_name} subtitle={`Club · ${fmtLongDay(it.session_date)}`} trailing={<StatusText status="club" />} />
                    ) : (
                      <Row key={`s${it.session_date}${i}`} first={i === 0}
                        title={it.project_at || it.lesson_name || it.module_name || it.sub_program || `${it.program} session`}
                        subtitle={[it.program, it.program === 'CREATE' && it.belt_level_at ? `${it.belt_level_at} belt${it.belt_sublevel_at ? `, level ${it.belt_sublevel_at}` : ''}` : [it.sub_program, it.module_name].filter(Boolean).join(' · ') || null, fmtLongDay(it.session_date), it.sensei_name ? `Sensei ${String(it.sensei_name).split(' ')[0]}` : null].filter(Boolean).join(' · ')}
                        trailing={it.status_at ? <StatusText status={it.status_at} /> : null} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ParentLayout>
  );
}
