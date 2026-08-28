import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BugIcon, CheckIcon, Globe2Icon, GraduationCapIcon, LockKeyholeIcon, SparklesIcon, TrophyIcon, WrenchIcon } from 'lucide-react';
import { Hero, Emblem, BeltRoad, BeltStickers, LevelPills, LevelMedal, hasLevelMedal, Group, Row, Tile, StatusDot, StatusText, BackChip } from './ParentUI';
import { BELTS, getLevels } from '../../utils/beltConfig';
import { levelProjects, levelStates, levelTitle, realSessions, trackModel, fmtDay } from '../../lib/parentProgress';
import { levelInfo, beltInfo, levelShot } from '../../lib/createCurriculum';
import { CREATE_STICKERS, STICKER_BELTS, stickerRequirement, stickersForBelt } from '../../lib/createStickers';
import { KIT_SHORT } from '../../lib/programTheme';
import { useCurriculum } from '../../context/CurriculumContext';
import BeltIcon from '../ui/BeltIcon';

// One course, opened from a child's profile.
//
// This used to be its own Courses section with a grid of art cards in front of
// it. The grid was a menu of five things a parent already sees on the profile,
// so the section came off and the profile's own program cards became the way
// in: /parent/students/:id/courses/:program. The page itself is unchanged —
// what changed is only where it is reached from, and where Back goes.
//
// CREATE is the star. It leads with a hero in the CREATE blue (the belt shows
// as its icon, not as the banner's colour), the level pills, the chosen
// level's real projects from the curriculum with what the log says about each,
// and the other levels. Programs without belts are tracks of modules (kits for
// Robotics), read off the curriculum and the log by trackModel: the same hero
// in their own art, the tracks as pills, the open track's modules, and the
// other tracks.

const EASE_OUT = [0.23, 1, 0.32, 1];

// The curriculum's own visual vocabulary. Only Build, Solve and
// Adventure/Project are tracked as completable rows today; Discover and
// Explore are included so the mapping stays whole if those stages become
// first-class rows later.
const PROJECT_KIND = {
  Discover: { Icon: Globe2Icon, color: '#293f98' },
  Build: { Icon: WrenchIcon, color: '#9138a3' },
  Explore: { Icon: GraduationCapIcon, color: '#319bc4' },
  Solve: { Icon: BugIcon, color: '#ef3e43' },
  Adventure: { Icon: TrophyIcon, color: '#4fc390' },
  Project: { Icon: TrophyIcon, color: '#4fc390' },
};

function ProjectKindIcon({ kind, status }) {
  const { Icon, color } = PROJECT_KIND[kind] || PROJECT_KIND.Project;
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-opacity ${status === 'todo' ? 'opacity-[0.55]' : ''}`}
      style={{ backgroundColor: color }}
    >
      <Icon size={17} strokeWidth={2.7} className="text-white" />
    </span>
  );
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


function ProjectRow({ p, first }) {
  const adventure = p.kind === 'Adventure';
  const sub = adventure
    ? (p.status === 'todo' ? 'Adventure · unlocks last' : `Adventure${p.date ? ` · ${fmtDay(p.date)}` : ''}`)
    : `${p.kind}${p.date ? ` · ${p.status === 'done' ? 'done' : 'last'} ${fmtDay(p.date)}` : ''}`;
  return (
    <Row first={first} inset lead={<ProjectKindIcon kind={p.kind} status={p.status} />} dim={p.status === 'todo'}
      title={p.name} subtitle={sub} trailing={p.status !== 'todo' ? <StatusText status={p.status} /> : null} />
  );
}

function isLevelComplete(targetBelt, targetLevel, currentBelt, currentLevel, logs) {
  const targetIdx = BELTS.findIndex((item) => item.name === targetBelt);
  const currentIdx = BELTS.findIndex((item) => item.name === currentBelt);
  if (targetIdx < 0 || currentIdx < 0) return false;
  if (targetIdx < currentIdx) return true;
  if (targetIdx > currentIdx) return false;
  if (Number(targetLevel) < Number(currentLevel)) return true;
  if (Number(targetLevel) > Number(currentLevel)) return false;

  const projects = levelProjects(targetBelt, targetLevel, logs);
  return projects.length > 0 && projects[projects.length - 1].status === 'done';
}

function StickerCollection({ belt, earnedIds, earnedTotal }) {
  const firstBelt = STICKER_BELTS.includes(belt) ? belt : STICKER_BELTS[STICKER_BELTS.length - 1];
  const [openBelt, setOpenBelt] = useState(firstBelt);
  useEffect(() => {
    if (STICKER_BELTS.includes(belt)) setOpenBelt(belt);
  }, [belt]);
  const stickers = stickersForBelt(openBelt);

  return (
    <Group className="relative">
      <div className="flex items-start justify-between gap-4 px-4 pb-3 pt-4 sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-ninja-navy">
            <SparklesIcon size={17} strokeWidth={2.5} aria-hidden />
            <h2 className="font-ninja text-[17px] font-extrabold">Stickers</h2>
          </div>
          <p className="mt-1 font-ninja text-[12.5px] text-ninja-muted">
            Complete levels to earn each sticker.
          </p>
        </div>
        <div className="flex-shrink-0 whitespace-nowrap pt-0.5 font-ninja text-[12px] font-extrabold text-ninja-blue">
          {earnedTotal} of {CREATE_STICKERS.length} earned
        </div>
      </div>

      <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-3 pb-3 sm:px-4" aria-label="Sticker belts">
        {STICKER_BELTS.map((name) => {
          const active = name === openBelt;
          return (
            <button
              key={name}
              type="button"
              onClick={() => setOpenBelt(name)}
              aria-pressed={active}
              className={`flex-shrink-0 rounded-full px-3 py-1.5 font-ninja text-[11.5px] font-extrabold transition-colors ${active ? 'text-white' : 'text-ninja-muted hover:text-ninja-navy'}`}
              style={{ background: active ? 'rgb(var(--ninja-blue))' : 'rgb(var(--ninja-navy) / 0.055)' }}
            >
              {name}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2.5 px-3 pb-3 sm:grid-cols-3 sm:px-4 lg:grid-cols-5">
        {stickers.map((item) => {
          const isEarned = earnedIds.has(item.id);
          return (
            <motion.div
              key={item.id}
              whileHover={isEarned ? { y: -4, rotate: -1 } : { y: -2 }}
              transition={{ type: 'spring', stiffness: 430, damping: 28 }}
              className="relative flex min-h-[184px] flex-col items-center overflow-hidden rounded-[18px] border border-ninja-navy/[0.07] px-3 pb-3 pt-4 text-center"
              style={{ background: isEarned ? 'rgb(var(--ninja-blue) / 0.045)' : 'rgb(var(--ninja-navy) / 0.025)' }}
            >
              <div className="relative flex h-[88px] w-full items-center justify-center">
                <img
                  src={item.src}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  className={`h-[82px] w-[82px] select-none object-contain transition duration-300 ${isEarned ? 'drop-shadow-[0_8px_9px_rgb(6_13_26_/_0.16)]' : 'grayscale opacity-25'}`}
                />
                <span
                  aria-hidden="true"
                  className={`absolute right-0 top-0 inline-flex h-7 w-7 items-center justify-center rounded-full text-white shadow-sm ${isEarned ? 'bg-emerald-500' : 'bg-ninja-navy/55'}`}
                >
                  {isEarned
                    ? <CheckIcon size={15} strokeWidth={3.2} />
                    : <LockKeyholeIcon size={14} strokeWidth={2.6} />}
                </span>
              </div>
              <p className={`mt-2 font-ninja text-[13.5px] font-extrabold leading-tight ${isEarned ? 'text-ninja-navy' : 'text-ninja-navy/55'}`}>
                {item.title}
              </p>
              <p className={`mt-1 font-ninja text-[11px] leading-snug ${isEarned ? 'font-bold text-emerald-600' : 'text-ninja-muted'}`}>
                {isEarned ? 'Earned' : stickerRequirement(item)}
              </p>
            </motion.div>
          );
        })}
      </div>
    </Group>
  );
}

function CreateDetail({ enrollment, logs, childName, backTo }) {
  const belt = enrollment.belt_level;
  const currentLevel = Number(enrollment.belt_sublevel) || (getLevels(belt)[0] ?? 1);
  const beltIdx = BELTS.findIndex((b) => b.name === belt);
  const pos = getLevels(belt).indexOf(currentLevel) + 1;

  // The belt being READ, which starts as the belt being worn. Tapping the road
  // walks the page to another belt's curriculum without pretending the ninja
  // moved: `belt` still lights the road's trail and still writes the summary
  // line, `viewBelt` decides which levels and projects are on screen.
  const [viewBelt, setViewBelt] = useState(belt);
  const [level, setLevel] = useState(currentLevel);
  const [dir, setDir] = useState(1);
  useEffect(() => { setViewBelt(belt); setLevel(currentLevel); }, [enrollment.id, belt, currentLevel]);

  const viewIdx = BELTS.findIndex((b) => b.name === viewBelt);
  const onBelt = viewBelt === belt;
  const earned = viewIdx >= 0 && beltIdx >= 0 && viewIdx < beltIdx;
  const levels = getLevels(viewBelt);
  const next = viewIdx >= 0 ? BELTS[viewIdx + 1]?.name : null;

  // A belt behind the ninja is finished top to bottom; one ahead has not been
  // opened at all. Only the belt actually being worn has a level part way in,
  // which is the one case levelStates was written for.
  const states = useMemo(
    () => levelStates(viewBelt, onBelt ? currentLevel : earned ? Infinity : -1),
    [viewBelt, onBelt, earned, currentLevel]);
  const projects = useMemo(() => levelProjects(viewBelt, level, logs), [viewBelt, level, logs]);
  const done = projects.filter((p) => p.status === 'done').length;
  const sessions = realSessions(logs);
  const levelState = states.find((s) => s.level === level)?.state;
  const started = useMemo(() => {
    const ds = sessions.filter((l) => l.belt_level_at === viewBelt && Number(l.belt_sublevel_at) === Number(level)).map((l) => String(l.session_date).split('T')[0]).sort();
    return ds[0] || null;
  }, [sessions, viewBelt, level]);

  const pick = (lv) => { setDir(lv > level ? 1 : -1); setLevel(lv); };
  const pickBelt = (name) => {
    if (name === viewBelt) return;
    const i = BELTS.findIndex((b) => b.name === name);
    setDir(i > viewIdx ? 1 : -1);
    setViewBelt(name);
    setLevel(name === belt ? currentLevel : (getLevels(name)[0] ?? 1));
  };

  // The poster's own words for this belt and level, where we have them.
  const info = levelInfo(viewBelt, level);
  const belted = beltInfo(viewBelt);
  const concepts = (info?.sets || []).map((st) => st.explore).filter(Boolean);
  const shot = levelShot(viewBelt, level);
  const lastLevel = levels.length ? levels[levels.length - 1] : null;
  const earnedStickerIds = useMemo(() => new Set(
    CREATE_STICKERS
      .filter((item) => item.levels.every((requiredLevel) => (
        isLevelComplete(item.belt, requiredLevel, belt, currentLevel, logs)
      )))
      .map((item) => item.id)
  ), [belt, currentLevel, logs]);

  const summary = onBelt
    ? [`Level ${currentLevel}`, levels.length ? `${pos} of ${levels.length}` : null, belted?.language, next ? `earns ${next}` : null, sessions.length ? `${sessions.length} session${sessions.length === 1 ? '' : 's'}` : null].filter(Boolean).join(' · ')
    : [earned ? 'Earned' : 'Ahead', levels.length ? `${levels.length} level${levels.length === 1 ? '' : 's'}` : null, belted?.language, next ? `earns ${next}` : null].filter(Boolean).join(' · ');

  if (!belt) {
    return (
      <div className="space-y-4">
        <Hero program="CREATE" size="page">
          {backTo && <div className="mb-10 lg:mb-6"><BackChip to={backTo} label="Back to profile" /></div>}
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
        {/* The belt IS the hero's art on every width. Desktop: it is scenery,
            and scenery has to stay legible as the thing it is. Blown up to
            twice the banner it stopped being a belt at all — the frame filled
            with the mask band and two eyes, which reads as shapes rather than
            as a ninja, and the hard arc of the ring cut a line across the
            middle of the banner that nothing in the design had asked for.

            So: 1.3x the banner's height, hung 3rem past its right edge
            (`calc(50% - 50cqw)` is the walk from this box out to that edge).
            Big enough to be cropped, small enough that the piece in frame is
            still recognisably the belt.

            The art is at FULL strength — no opacity at all. The fade is
            entirely the MASK: weight in the top right corner, dissolving
            toward the bottom left, which is exactly where the words and the
            belt road are. So the art never has an edge that crosses content,
            and the dimmed belts at the end of the road are never asked to
            hold their own against the brightest part of a picture. A flat
            opacity was tried at several values and each one did the same two
            things wrong: it drained the belt's colour, which is the one thing
            the art is there to say, and it still left the ring's outline
            drawn straight through the road. The stops are late on purpose —
            solid for the first 55% and not gone until 96% — so most of what
            is on screen is the belt at its true colour and only the tail of
            it thins out over the words.

            One belt is not the sticker sheet's own: `belt-white-lg.png` is
            the BLUE belt with its ring recoloured white, because the sheet's
            white belt carries a black outer stroke so it stays visible on
            white paper. Right for a sticker, wrong on a blue banner, and the
            other twelve carry no such stroke. The small `belt-white.png`
            keeps its outline — it is drawn on white cards all over the staff
            side, where without one there would be nothing to see.

            `large` asks for the 1280px copy, because the banner paints one
            at around 650 CSS px — some 1300 device pixels on a retina screen
            — and the everyday 256px file upscaled that far looks like a bad
            JPEG. The nine belts that have one get it; the metallic four have
            no transparent source art yet and fall back to the small file.
            They are NOT blurred to cover for it: blur took the one thing a
            metal belt has to say — its colour — and stirred it into the
            gradient. Soft and coloured beats smooth and grey.

            Phone: a bit smaller and centered, so the pills row underneath
            still breathes. Both sit behind the ink either way — the hero's
            isolation lets a negative z sit above the gradient but under
            everything written. */}
        <span
          aria-hidden
          className="hidden lg:block absolute inset-y-[-15%] right-[calc(50%-50cqw-3rem)] aspect-square pointer-events-none"
          style={{
            zIndex: -1,
            maskImage: 'linear-gradient(to bottom left, #000 55%, transparent 96%)',
            WebkitMaskImage: 'linear-gradient(to bottom left, #000 55%, transparent 96%)',
          }}
        >
          <BeltIcon belt={viewBelt} large style={{ width: '100%', height: '100%' }} />
        </span>
        <span
          aria-hidden
          className="lg:hidden absolute top-1/2 -translate-y-1/2 right-[-2rem] h-[72%] aspect-square pointer-events-none"
          style={{ zIndex: -1 }}
        >
          <BeltIcon belt={viewBelt} large style={{ width: '100%', height: '100%' }} />
        </span>
        {/* The belt's own poster stickers, after the belt art so they land in
            front of it rather than behind. */}
        <BeltStickers belt={viewBelt} />
        {backTo && <div className="mb-10 lg:mb-6"><BackChip to={backTo} label="Back to profile" /></div>}
        <div className="flex items-center lg:items-start justify-between gap-5">
          <div className="flex items-center gap-4 min-w-0">
            <div className="min-w-0">
              <p className="font-ninja text-[12px] font-extrabold opacity-85 truncate">CREATE · {childName}</p>
              <p className="font-ninja font-extrabold text-[36px] lg:text-[32px] leading-none mt-1 tracking-[-0.015em]">{viewBelt} belt</p>
              <p className="font-ninja text-[13px] opacity-85 mt-2 truncate">{summary}</p>
            </div>
          </div>
        </div>
        <div className="lg:hidden mt-4">
          <LevelPills states={states} value={level} onChange={pick} onHero layoutId="level-pill-mobile" />
        </div>
        {/* No clearance for the art any more: it is faded into the gradient
            now, so the road crosses it instead of stopping short of it. */}
        <BeltRoad current={belt} selected={viewBelt} onSelect={pickBelt} onHero className="mt-5 hidden lg:block" />
      </Hero>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${viewBelt}-${level}`}
            initial={{ opacity: 0, x: 10 * dir }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 * dir }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
          >
            <Group tint={levelState === 'current' ? 'green' : levelState === 'done' ? 'blue' : undefined}>
              {/* The game itself, straight off the wall poster, tilted into
                  the corner like a photo dropped on the card.

                  It was a full-bleed banner first and that was the wrong
                  shape twice over: stretched to the card's width it upscaled
                  a 424px file past 1.6x, and no aspect ratio fixes that — a
                  wide strip of one screenshot is not a picture of a game, it
                  is a crop of a wrench. Held at its own size and turned a few
                  degrees it stays sharp, it reads as an object rather than a
                  header, and it sits with the rest of the bento instead of
                  fighting it. The card clips whatever hangs over the edge. */}
              <div>
                {/* A row, not an overlay: the picture is a flex item, so the
                    header grows to hold ALL of it. Floated into the corner it
                    was clipped by whatever height the words happened to need,
                    which is how you end up showing two thirds of a game. The
                    tilt is a transform, so it costs no layout — only the four
                    corners drift, and the card has room for them. */}
                <div className="flex items-start gap-3 pl-4 pr-4 pt-3.5 pb-3">
                <div className="min-w-0 flex-1">
                  <p className="font-ninja text-[11px] font-extrabold uppercase tracking-[0.08em]" style={levelState ? { color: 'var(--tint-ink)' } : undefined}>
                    Level {level}{levelState === 'current' ? ' · now' : levelState === 'done' ? ' · done' : ' · ahead'}
                  </p>
                  {/* The poster's name for the level. Only when we have none
                      does it fall back to the old guess made from the level's
                      last project. */}
                  {(info?.topic || levelTitle(viewBelt, level) !== `Level ${level}`) && (
                    <p className="font-ninja font-extrabold text-[20px] text-ninja-navy leading-tight mt-0.5">
                      {info?.topic || levelTitle(viewBelt, level)}
                    </p>
                  )}
                  <p className="font-ninja text-[12.5px] v2 text-ninja-muted mt-0.5">
                    {[`${done} of ${projects.length} projects`, started ? `started ${fmtDay(started)}` : null].filter(Boolean).join(' · ')}
                  </p>
                </div>
                {shot && (
                  <img
                    src={shot}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    className="flex-shrink-0 select-none w-[132px] sm:w-[176px] rounded-[10px] rotate-[3deg] mt-0.5 ring-1 ring-black/10 shadow-[0_12px_28px_-12px_rgb(6_13_26_/_0.5)]"
                  />
                )}
                </div>
                {/* What the ninja actually builds at the end of the level. It
                    is the one sentence a parent can read and picture. */}
                {info?.quest && (
                  <p className="font-ninja text-[13.5px] leading-relaxed text-ninja-navy/85 px-4 pb-3 -mt-1">{info.quest}</p>
                )}
              </div>
              <div className={`mx-3 mb-3 rounded-[14px] overflow-hidden ${levelState ? 'border border-ninja-navy/[0.06]' : ''}`}>
                {projects.map((p, i) => <ProjectRow key={p.name} p={p} first={i === 0} />)}
                {projects.length === 0 && <p className="px-4 py-3 font-ninja text-sm text-ninja-muted">No projects listed for this level yet.</p>}
              </div>
              {/* The concepts the level teaches, which is the EXPLORE half of
                  each build/explore/solve set. The project rows say what gets
                  made; this says what it was for. */}
              {concepts.length > 0 && (
                <div className="px-4 pb-4 -mt-1">
                  <p className="font-ninja text-[11px] font-extrabold uppercase tracking-[0.08em] text-ninja-muted">Concepts</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {concepts.map((c) => (
                      <span key={c} className="font-ninja text-[12px] font-bold rounded-lg px-2.5 py-1 bg-ninja-navy/[0.05] text-ninja-navy/80">{c}</span>
                    ))}
                  </div>
                </div>
              )}
              {/* A belt that closes a pair ends with a Mastery Mission. It
                  belongs on the last level, where it actually happens. */}
              {belted?.mastery && level === lastLevel && (
                <div className="mx-3 mb-3 rounded-[14px] px-4 py-3" style={{ background: 'rgb(var(--ninja-blue) / 0.07)' }}>
                  <p className="font-ninja text-[11px] font-extrabold uppercase tracking-[0.08em] text-ninja-blue">Mastery mission</p>
                  <p className="font-ninja text-[13px] leading-relaxed text-ninja-navy/85 mt-1">{belted.mastery}</p>
                </div>
              )}
            </Group>
          </motion.div>
        </AnimatePresence>

        <div className="space-y-4">
          <Group title={onBelt ? 'All levels' : `${viewBelt} levels`}>
            {states.map((s, i) => {
              const finished = sessions.filter((l) => l.belt_level_at === viewBelt && Number(l.belt_sublevel_at) === s.level && l.status_at === 'Completed').map((l) => String(l.session_date).split('T')[0]).sort();
              const lastDone = finished[finished.length - 1] || null;
              return (
                <Row key={s.level} first={i === 0} onClick={() => pick(s.level)} active={s.level === level} dim={s.state === 'ahead'}
                  lead={hasLevelMedal(viewBelt, s.level)
                    ? <LevelMedal belt={viewBelt} level={s.level} ahead={s.state === 'ahead'} />
                    : <Tile tint={s.state === 'done' ? 'rgb(34 197 94 / 0.14)' : s.state === 'current' ? 'rgb(var(--ninja-blue) / 0.14)' : 'rgb(var(--ninja-navy) / 0.06)'} color={s.state === 'done' ? '#15803d' : s.state === 'current' ? undefined : 'rgb(var(--ninja-muted))'}>{s.level}</Tile>}
                  title={`Level ${s.level}`}
                  subtitle={[`${s.projectCount} project${s.projectCount === 1 ? '' : 's'}`, s.state === 'current' ? 'now' : s.state === 'done' && lastDone ? `done ${fmtDay(lastDone)}` : null].filter(Boolean).join(' · ')}
                />
              );
            })}
          </Group>
        </div>
      </div>

      <StickerCollection
        belt={viewBelt}
        earnedIds={earnedStickerIds}
        earnedTotal={earnedStickerIds.size}
      />
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
        {backTo && <div className="mb-10 lg:mb-6"><BackChip to={backTo} label="Back to profile" /></div>}
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

export default function CourseDetail({ enrollment, logs, childName, backTo }) {
  return enrollment.program === 'CREATE'
    ? <CreateDetail enrollment={enrollment} logs={logs} childName={childName} backTo={backTo} />
    : <TrackDetail enrollment={enrollment} logs={logs} childName={childName} backTo={backTo} />;
}
