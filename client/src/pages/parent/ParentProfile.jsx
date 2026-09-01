import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import ParentLayout, { ChildSwitcher } from '../../components/layout/ParentLayout';
import { useParentPortal } from '../../context/ParentPortalContext';
import { PageTitle, Row, StatusText, MoreLink, PinnedHero, PageSheet } from '../../components/parent/ParentUI';
import NinjaHero from '../../components/parent/NinjaHero';
import ProgressVisuals from '../../components/parent/ProgressVisuals';
import { StickerBook } from '../../components/parent/StickerCollection';
import { Pin } from '../../components/shared/PinnedNote';
import LazyMarkdownEditor from '../../components/shared/LazyMarkdownEditor';
import { FLAT } from '../../lib/surfaces';
import { SkeletonProfile, SkeletonCards } from '../../components/ui/Skeleton';
import Modal from '../../components/ui/Modal';
import { NINJA_TONES, NINJA_TONE_LABELS, DEFAULT_TONE, ninjaSrc } from '../../utils/ninjas';
import useIsDesktop from '../../lib/useIsDesktop';
import { activityFeed, fmtLongDay } from '../../lib/parentProgress';

// The course a program card opens into. Lazy because it carries the whole
// CREATE curriculum (43 levels of the poster's own words) and a profile that
// is never opened into a course should not pay for it.
const CourseDetail = lazy(() => import('../../components/parent/CourseDetail'));

// The full profile: everything about one child on one page, and the way into
// each of their courses.
//
// Home is the glance; this is the record: the note the parent
// keeps for the senseis (the one thing in the portal a parent writes rather
// than reads), the progress visuals, and every session grouped by month. Who
// they are and what they are in lives on Home, so the About card that used to
// sit here was a second printing of it. The URL names the child, so the link
// on a Home card lands here for that child even when another is selected.
//
// Courses used to be a section of its own with a grid of art cards in front of
// it, and that grid was a menu of the programs this page already draws. It is
// gone. A program card here IS the way in: it opens
// /parent/students/:id/courses/:program, which is the same page it always was,
// rendered in place of the profile with Back going to the profile.

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

// The skin tone of this family's own ninja.
//
// It sits on the parent side rather than in the staff tools because it is the
// one thing here that is about what a kid looks like rather than about what
// they have done, and a family should not have to ask a sensei to change it.
// The rest of the portal stays read-only; this decides a picture.
//
// The three are drawn as the real ninja at this ninja's own belt, so the only
// thing changing between them is the thing being chosen. Saving is immediate
// on tap — there is no Save button, because there is nothing to review: the
// hero behind the dialog is already showing the answer.
function NinjaToneButton({ child, belt, onSave }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const current = child?.ninja_skin_tone || DEFAULT_TONE;
  const first = child?.full_name?.split(' ')[0];

  useEffect(() => { setOpen(false); setError(''); }, [child?.id]);

  const pick = async (tone) => {
    if (tone === current) return;
    setSaving(true); setError('');
    try { await onSave(tone); }
    catch { setError('Could not save. Try again.'); }
    finally { setSaving(false); }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => { setError(''); setOpen(true); }}
        title="Choose your ninja"
        aria-label={`Change ${first}'s ninja`}
        className="flex items-center justify-center w-10 h-10 rounded-full transition-colors bg-white border border-ninja-border hover:border-ninja-blue/40 overflow-hidden"
      >
        <img src={ninjaSrc(belt, 'wave', current)} alt="" aria-hidden draggable={false} className="w-7 h-7 object-contain" />
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Your ninja">
        <div className="space-y-3">
          <p className="font-ninja text-[13px] text-ninja-muted">
            Pick the ninja that looks most like {first}.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {NINJA_TONES.map((tone) => {
              const selected = current === tone;
              return (
                <button
                  key={tone}
                  type="button"
                  onClick={() => pick(tone)}
                  disabled={saving}
                  aria-pressed={selected}
                  className={`flex flex-col items-center rounded-xl border p-2 transition-colors disabled:opacity-60 ${
                    selected ? 'border-ninja-blue bg-ninja-blue/10' : 'border-ninja-border bg-ninja-bg hover:border-ninja-blue/40'
                  }`}
                >
                  <img
                    src={ninjaSrc(belt, 'wave', tone)}
                    alt={NINJA_TONE_LABELS[tone]}
                    draggable={false}
                    className="h-28 w-full object-contain"
                  />
                  <span className={`mt-1 font-ninja text-xs font-extrabold ${selected ? 'text-ninja-blue' : 'text-ninja-muted'}`}>
                    {NINJA_TONE_LABELS[tone]}
                  </span>
                </button>
              );
            })}
          </div>
          {error && <p className="text-ninja-red font-ninja text-xs">{error}</p>}
        </div>
      </Modal>
    </>
  );
}

const EASE_OUT = [0.23, 1, 0.32, 1];
const enc = (p) => encodeURIComponent(p);

export default function ParentProfile() {
  const { id, program } = useParams();
  const navigate = useNavigate();
  const desktop = useIsDesktop();
  const { students, setActiveId, setViewAll, detailFor, loadDetail, detailLoading, saveNote, saveNinjaTone } = useParentPortal();
  const target = Number(id);
  const child = (students || []).find((s) => s.id === target) || null;
  const detail = detailFor(target);
  const courseName = program ? decodeURIComponent(program) : null;

  // Landing here IS choosing this child, so the switchers agree with the page.
  useEffect(() => {
    if (child) { setActiveId(child.id); setViewAll(false); }
  }, [child?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (child) loadDetail(child.id); }, [child?.id, loadDetail]); // eslint-disable-line react-hooks/exhaustive-deps

  // A course in the URL this child is not in — an old link, or the switcher
  // moved to a sibling who is in different programs. Fall back to the profile
  // rather than showing a course that is not theirs.
  useEffect(() => {
    if (courseName && detail && !(detail.programs || []).some((p) => p.program === courseName)) {
      navigate(`/parent/students/${target}`, { replace: true });
    }
  }, [courseName, detail, target, navigate]);

  const courseHref = useCallback((name) => `/parent/students/${target}/courses/${enc(name)}`, [target]);

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
  // What the banner leads with. CREATE is the spine of the centre, so its belt
  // is the ninja's belt where they are in it; otherwise the banner takes the
  // colour of whatever they ARE in and shows no belt at all rather than
  // inventing a White one for a JR-only ninja.
  const createEnrollment = programs.find((p) => p.program === 'CREATE');
  const heroProgram = createEnrollment ? 'CREATE' : (programs[0]?.program || 'CREATE');
  const belt = createEnrollment?.belt_level || null;
  const level = createEnrollment?.belt_sublevel || null;
  const since = child.created_at
    ? new Date(child.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;
  const eyebrow = since ? `Ninja since ${since}` : 'Full profile';
  // Only ever off the loaded detail: the enrollment on the students list is a
  // summary, and the course reads fields (last kit, last module) that only the
  // full record carries. Without it the page falls back to the profile, which
  // is already fetching.
  const openCourse = courseName && detail ? programs.find((p) => p.program === courseName) : null;

  // With a course open, the course is the page — the same full-bleed hero it
  // had as its own section, with Back returning to the child it belongs to.
  if (openCourse) {
    return (
      <ParentLayout switcher={switcher} bleed={!desktop}>
        <Suspense fallback={<SkeletonCards count={1} height={260} label={`Loading ${openCourse.program}`} />}>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: EASE_OUT }}>
            <CourseDetail
              enrollment={openCourse}
              logs={(detail?.session_logs || []).filter((l) => l.program === openCourse.program)}
              childName={first}
              backTo={`/parent/students/${target}`}
            />
          </motion.div>
        </Suspense>
      </ParentLayout>
    );
  }

  return (
    <ParentLayout switcher={switcher}>
      <div className="relative">
        {/* The banner IS the page title. A ninja's own profile opening on a
            line of grey text said nothing their name did not; this says the
            belt, the programs and the sessions before a word is read, and
            puts the child in it at size. It is also the layer underneath: it
            holds the top of the screen and the page slides up over it. */}
        <PinnedHero>
          <NinjaHero
            program={heroProgram}
            name={child.full_name}
            eyebrow={eyebrow}
            belt={belt}
            level={level}
            tone={child.ninja_skin_tone}
            programCount={programs.length}
            sessionCount={feed.length}
            right={(
              <div className="flex items-center gap-2">
                <NinjaToneButton child={child} belt={belt} onSave={(tone) => saveNinjaTone(child.id, tone)} />
                <NoteButton child={child} text={detail?.special_instructions || ''} onSave={(text) => saveNote(child.id, text)} />
              </div>
            )}
            className="!mt-0"
          />
        </PinnedHero>

        {/* Everything below the banner rides on one sheet, which is what
            slides up over it. The spacing inside is the page as it was; the
            sheet's own padding stands in for the gap the banner used to have
            under it. */}
        <PageSheet>
          <div className="space-y-4 lg:space-y-5">
            <div className="lg:hidden"><ChildSwitcher layoutId="parent-child-mobile" /></div>

            {/* Activity, then the Courses section that Courses used to be a page
                of. Every card in it opens the course it describes. */}
            {detail && programs.length > 0 && (
              <ProgressVisuals programs={programs} sessionLogs={detail.session_logs || []} childName={first} courseHref={courseHref} />
            )}

            {/* The stickers this ninja has actually earned, newest first, after
                the courses that explain where they came from. Only for a ninja in
                CREATE: the stickers are CREATE's belt art and there is nothing to
                show a JR or Robotics ninja here. */}
            {detail && createEnrollment && (
              <StickerBook
                belt={belt}
                level={level}
                logs={(detail.session_logs || []).filter((l) => l.program === 'CREATE')}
                childName={first}
                href={`/parent/students/${target}/stickers`}
              />
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
        </PageSheet>
      </div>
    </ParentLayout>
  );
}
