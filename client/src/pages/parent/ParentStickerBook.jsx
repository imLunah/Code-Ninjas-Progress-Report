import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckIcon, Layers3Icon, LockKeyholeIcon, SparklesIcon, TrendingUpIcon } from 'lucide-react';
import ParentLayout, { ChildSwitcher } from '../../components/layout/ParentLayout';
import { useParentPortal } from '../../context/ParentPortalContext';
import { Hero, PinnedHero, PageSheet, BackChip } from '../../components/parent/ParentUI';
import { RarityChip, StickerZoom, useLockedShake, useStickerZoom } from '../../components/parent/StickerCollection';
import { CREATE_STICKERS } from '../../lib/createStickers';
import { isLevelComplete, stickerProgress } from '../../lib/stickerProgress';
import { stickerPercentile, useStickerCohort, useStickerRarity } from '../../lib/stickerRarity';
import { SkeletonProfile } from '../../components/ui/Skeleton';
import { CARD, FLAT } from '../../lib/surfaces';
import { fmtDay } from '../../lib/parentProgress';

// Duolingo's achievements page works because the numbers get one compact,
// high-contrast shelf and the awards themselves are allowed to be the art.
// This follows that hierarchy without inventing XP or streaks DojoLink does
// not record: every number below is derived from the same CREATE progress as
// the stickers.

const RECORDS = [
  { key: 'percentile', title: 'Ahead of the dojo', Icon: TrendingUpIcon, background: 'linear-gradient(145deg, #5b2138 0%, #2f1221 100%)', glow: '#fb7185' },
  { key: 'latest', title: 'Most recent sticker', Icon: SparklesIcon, background: 'linear-gradient(145deg, #66440b 0%, #302006 100%)', glow: '#facc15' },
  { key: 'collection', title: 'Collection complete', Icon: Layers3Icon, background: 'linear-gradient(145deg, #3f2a69 0%, #211534 100%)', glow: '#c084fc' },
];

// `headline` carries a sticker's name rather than a number, so it drops to a
// size a two-word title and a five-word one can both live at. The card is
// otherwise identical: a shelf where one tile suddenly changed shape would
// read as three unrelated things.
function RecordCard({ record, value, caption, art, headline = false }) {
  const { Icon } = record;
  return (
    <article
      className="relative min-h-[196px] min-w-[236px] flex-1 overflow-hidden rounded-[26px] border border-white/10 px-5 pb-5 pt-4 text-white shadow-[inset_0_-7px_0_rgb(0_0_0/0.17),0_16px_30px_-22px_rgb(6_13_26/0.7)] sm:min-w-[250px]"
      style={{ background: record.background }}
    >
      <div aria-hidden="true" className="absolute -right-5 -top-5 h-36 w-36 rounded-full blur-3xl" style={{ backgroundColor: record.glow, opacity: 0.22 }} />
      {art && <img src={art} alt="" aria-hidden="true" className="pointer-events-none absolute right-2 top-5 h-28 w-28 select-none object-contain opacity-25 saturate-150" />}
      <div className="relative flex items-center gap-2 text-white/70">
        <Icon size={17} strokeWidth={2.5} aria-hidden />
        <span className="font-ninja text-[10.5px] font-extrabold uppercase tracking-[0.11em]">Personal record</span>
      </div>
      <p
        className={`relative font-ninja font-black tracking-[-0.04em] ${headline ? 'mt-5 line-clamp-2 text-[23px] leading-[1.15]' : 'mt-6 text-[42px] leading-none'}`}
        style={{ textShadow: `0 0 28px ${record.glow}66` }}
      >
        {value}
      </p>
      <p className="relative mt-4 font-ninja text-[15px] font-extrabold">{record.title}</p>
      <p className="relative mt-1 font-ninja text-[11.5px] font-bold text-white/55">{caption}</p>
    </article>
  );
}

function AwardSticker({ item, isEarned, completed, onOpen, flat, rarity }) {
  const { controls, shake } = useLockedShake();
  const total = item.levels.length;

  return (
    <motion.div animate={controls} className="flex min-w-0">
      <button
        type="button"
        onClick={() => (isEarned ? onOpen(item) : shake())}
        aria-label={`${item.title}${rarity ? `, ${rarity.label}` : ''}, ${isEarned ? 'earned' : `locked, ${completed} of ${total} levels complete`}`}
        className="group flex w-full min-w-0 flex-col items-center rounded-[22px] px-2 pb-4 pt-3 text-center transition-[transform,background-color] duration-150 hover:bg-ninja-blue/[0.035] active:scale-[0.97]"
      >
        <span className="relative flex h-[136px] w-full items-center justify-center sm:h-[150px]">
          <span
            aria-hidden="true"
            className={`absolute h-[112px] w-[112px] rounded-full transition-[transform,opacity] duration-200 group-hover:scale-[1.04] sm:h-[124px] sm:w-[124px] ${isEarned ? 'opacity-100' : 'opacity-45'}`}
            style={{ background: isEarned ? 'radial-gradient(circle, rgb(var(--ninja-blue) / 0.12), transparent 68%)' : 'radial-gradient(circle, rgb(var(--ninja-navy) / 0.06), transparent 68%)' }}
          />
          <motion.img
            layoutId={flat ? undefined : `sticker-art-${item.id}`}
            src={item.src}
            alt=""
            aria-hidden="true"
            draggable={false}
            className={`relative h-[118px] w-[118px] select-none object-contain sm:h-[132px] sm:w-[132px] ${isEarned ? 'drop-shadow-[0_15px_13px_rgb(6_13_26/0.18)]' : 'grayscale opacity-25'}`}
          />
          <span aria-hidden="true" className={`absolute right-[12%] top-2 inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-white shadow-sm ${isEarned ? 'bg-emerald-500' : 'bg-ninja-navy/45'}`}>
            {isEarned ? <CheckIcon size={14} strokeWidth={3.2} /> : <LockKeyholeIcon size={13} strokeWidth={2.8} />}
          </span>
        </span>
        <span className={`mt-1 block max-w-full font-ninja text-[14px] font-extrabold leading-tight ${isEarned ? 'text-ninja-navy' : 'text-ninja-navy/50'}`}>{item.title}</span>
        <span className={`mt-1 block font-ninja text-[11.5px] font-bold ${isEarned ? 'text-emerald-600' : 'text-ninja-muted'}`}>{completed} of {total}</span>
        <span className="mt-2"><RarityChip rarity={rarity} size="sm" /></span>
      </button>
    </motion.div>
  );
}

export default function ParentStickerBook() {
  const { id } = useParams();
  const { students, setActiveId, setViewAll, detailFor, loadDetail, detailLoading } = useParentPortal();
  const flat = useReducedMotion();
  const rarity = useStickerRarity();
  const cohort = useStickerCohort();
  const { zoomed, open, close } = useStickerZoom();

  const target = Number(id);
  const child = (students || []).find((s) => s.id === target) || null;
  const detail = detailFor(target);

  useEffect(() => {
    if (child) { setActiveId(child.id); setViewAll(false); }
  }, [child?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (child) loadDetail(child.id); }, [child?.id, loadDetail]); // eslint-disable-line react-hooks/exhaustive-deps

  const programs = detail?.programs || child?.programs || [];
  const createEnrollment = programs.find((p) => p.program === 'CREATE');
  const belt = createEnrollment?.belt_level || null;
  const level = createEnrollment?.belt_sublevel || null;
  const first = child?.full_name?.split(' ')[0] || 'this ninja';

  const logs = useMemo(
    () => (detail?.session_logs || []).filter((l) => l.program === 'CREATE'),
    [detail]);
  const progress = useMemo(
    () => stickerProgress({ belt, level, logs }),
    [belt, level, logs]);

  const switcher = <ChildSwitcher layoutId="parent-child-desktop" />;

  if (students === null || (child && !detail && detailLoading)) {
    return <ParentLayout switcher={switcher}><SkeletonProfile label="Loading the sticker book" /></ParentLayout>;
  }
  if (!child) {
    return (
      <ParentLayout switcher={switcher}>
        <div className={`${FLAT} p-8 text-center`}>
          <p className="font-ninja font-bold text-ninja-navy">That ninja is not on this account.</p>
        </div>
      </ParentLayout>
    );
  }

  const total = CREATE_STICKERS.length;
  const earned = progress.earned.length;
  const pct = Math.round((earned / total) * 100);
  const latest = progress.earned.at(-1) || null;
  const remaining = total - earned;

  // The percentile needs the roster, which arrives after the page does and may
  // never arrive at all. Its card is dropped rather than shown as a dash: a
  // shelf of two solid numbers beats three where one is an apology.
  const percentile = stickerPercentile(cohort, earned);

  const recordValues = {
    percentile: percentile == null ? null : {
      value: `${percentile}%`,
      caption: percentile === 0
        ? 'Every sticker from here moves this'
        : `More stickers than ${percentile}% of CREATE ninjas`,
      art: latest?.src || CREATE_STICKERS[0].src,
    },
    latest: {
      value: latest ? latest.title : 'Not yet',
      caption: latest?.earnedOn ? fmtDay(latest.earnedOn) : latest ? `${latest.belt} belt` : 'The first one is waiting',
      art: latest?.src || CREATE_STICKERS[0].src,
      headline: true,
    },
    collection: {
      value: `${pct}%`,
      caption: remaining ? `${remaining} sticker${remaining === 1 ? '' : 's'} left to collect` : 'Every sticker collected',
      art: CREATE_STICKERS.at(-1).src,
    },
  };
  const records = RECORDS.filter((record) => recordValues[record.key]);

  return (
    <ParentLayout switcher={switcher}>
      <div className="relative">
        <PinnedHero>
          <Hero program="CREATE" size="page" className="!mt-0">
            <div className="mb-8 lg:mb-6"><BackChip to={`/parent/students/${target}`} label="Back to profile" /></div>
            <p className="font-ninja text-[12px] font-extrabold uppercase tracking-[0.08em] opacity-85 truncate">CREATE · {child.full_name}</p>
            <h1 className="font-ninja font-extrabold text-[34px] lg:text-[42px] leading-none mt-1.5 tracking-[-0.02em]">Sticker achievements</h1>

            {/* The bar is the one number a parent came for, drawn rather than
                written. It fills on arrival, from nothing, so the length is read
                as a distance travelled instead of a static stripe. */}
            <div className="mt-4 max-w-[360px]">
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/25">
                <motion.div
                  className="h-full rounded-full bg-white"
                  initial={flat ? false : { width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
                />
              </div>
              <p className="font-ninja text-[11.5px] font-extrabold uppercase tracking-[0.08em] opacity-80 mt-2">
                {pct}% complete
              </p>
            </div>
          </Hero>
        </PinnedHero>

        <PageSheet>
          <section aria-labelledby="records-heading">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 id="records-heading" className="font-ninja text-[24px] font-extrabold tracking-[-0.02em] text-ninja-navy">Personal records</h2>
              </div>
              <p className="hidden font-ninja text-[12px] font-bold text-ninja-muted sm:block">CREATE progress</p>
            </div>

            <div className="-mx-4 mt-4 flex gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
              {records.map((record) => (
                <RecordCard key={record.key} record={record} {...recordValues[record.key]} />
              ))}
            </div>
          </section>

          <section aria-labelledby="awards-heading" className={`${CARD} mt-7 overflow-hidden px-3 py-5 sm:px-5 sm:py-6 lg:mt-9`}>
            <div className="flex items-end justify-between gap-4 px-1 sm:px-2">
              <div>
                <p className="font-ninja text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-ninja-blue">The collection</p>
                <h2 id="awards-heading" className="mt-1 font-ninja text-[24px] font-extrabold tracking-[-0.02em] text-ninja-navy">Sticker awards</h2>
                <p className="mt-1 font-ninja text-[12.5px] text-ninja-muted">Each one marks a real CREATE milestone.</p>
              </div>
              <p className="flex-shrink-0 font-ninja text-[13px] font-extrabold text-ninja-blue">{earned} of {total}</p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-x-1 gap-y-3 sm:grid-cols-3 sm:gap-x-2 lg:grid-cols-4 xl:gap-x-4">
              {progress.all.map((item) => {
                const completed = item.levels.filter((required) => isLevelComplete(item.belt, required, belt, level, logs)).length;
                return (
                  <AwardSticker
                    key={item.id}
                    item={item}
                    isEarned={item.earned}
                    completed={completed}
                    onOpen={open}
                    flat={flat}
                    rarity={rarity?.[item.id]}
                  />
                );
              })}
            </div>
          </section>
        </PageSheet>
      </div>

      <AnimatePresence>
        {zoomed && (
          <StickerZoom
            key={zoomed.id}
            item={zoomed}
            isEarned={progress.earnedIds.has(zoomed.id)}
            childName={first}
            onClose={close}
            flat={flat}
            rarity={rarity?.[zoomed.id]}
          />
        )}
      </AnimatePresence>
    </ParentLayout>
  );
}
