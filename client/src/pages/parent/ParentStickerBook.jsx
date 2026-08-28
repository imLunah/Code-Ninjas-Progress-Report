import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import ParentLayout, { ChildSwitcher } from '../../components/layout/ParentLayout';
import { useParentPortal } from '../../context/ParentPortalContext';
import { Hero, PinnedHero, PageSheet, BackChip } from '../../components/parent/ParentUI';
import { StickerCard, StickerZoom, useStickerZoom } from '../../components/parent/StickerCollection';
import { CREATE_STICKERS, STICKER_BELTS, stickersForBelt } from '../../lib/createStickers';
import { stickerProgress } from '../../lib/stickerProgress';
import { useStickerRarity } from '../../lib/stickerRarity';
import { SkeletonProfile } from '../../components/ui/Skeleton';
import { FLAT } from '../../lib/surfaces';
import BeltIcon from '../../components/ui/BeltIcon';

// The whole sticker book: all 35, every belt, earned and locked together.
//
// The profile carries the five newest and the course carries the belt it is
// about; this is the shelf they both point at. Locked stickers are the point
// of it rather than an omission — an achievement board that only shows what
// you already have is a receipt. They sit greyed with what unlocks them
// printed underneath, and they refuse to open (the card rattles, the way the
// album's do).
//
// Every belt is one page of the book, in curriculum order, and each page
// arrives as it is scrolled to rather than all 35 landing at once.
//
// The depth is the same CSS 3D the stickers wear everywhere else in the
// portal (ui/Tilt): real perspective, a pointer tilt, the art floating above
// its card on its own Z plane. WebGL was considered and left out on purpose.
// The artwork is 35 flat die-cut PNGs, which in three.js would be 35 textured
// planes — the thing CSS 3D already draws, for about 600kB of library on a
// portal whose whole initial bundle is ~53kB and whose routes are lazy for
// exactly that reason. If this ever wants something WebGL genuinely does (a
// lit scene, a book that bends as it turns), that is the moment to add it,
// behind a lazy import of this route only.

function BeltPage({ belt, progress, onOpen, flat, rarity }) {
  const stickers = stickersForBelt(belt);
  if (!stickers.length) return null;
  const earnedHere = stickers.filter((item) => progress.earnedIds.has(item.id)).length;
  const done = earnedHere === stickers.length;

  return (
    <motion.section
      initial={flat ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={`${FLAT} overflow-hidden`}
      aria-label={`${belt} belt stickers`}
    >
      <div className="flex items-center justify-between gap-4 px-4 pb-3 pt-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <BeltIcon belt={belt} size={26} className="flex-shrink-0" />
          <h2 className="font-ninja text-[16px] font-extrabold text-ninja-navy">{belt} belt</h2>
        </div>
        <div className={`flex-shrink-0 whitespace-nowrap font-ninja text-[12px] font-extrabold ${done ? 'text-emerald-600' : 'text-ninja-muted'}`}>
          {earnedHere} of {stickers.length}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 px-3 pb-4 sm:grid-cols-3 sm:px-4 lg:grid-cols-5">
        {stickers.map((item) => (
          <StickerCard
            key={item.id}
            item={item}
            isEarned={progress.earnedIds.has(item.id)}
            onOpen={onOpen}
            flat={flat}
            rarity={rarity?.[item.id]}
          />
        ))}
      </div>
    </motion.section>
  );
}

export default function ParentStickerBook() {
  const { id } = useParams();
  const { students, setActiveId, setViewAll, detailFor, loadDetail, detailLoading } = useParentPortal();
  const flat = useReducedMotion();
  const rarity = useStickerRarity();
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

  return (
    <ParentLayout switcher={switcher}>
      <div className="relative">
        <PinnedHero>
          <Hero program="CREATE" size="page" className="!mt-0">
            <div className="mb-8 lg:mb-6"><BackChip to={`/parent/students/${target}`} label="Back to profile" /></div>
            <p className="font-ninja text-[12px] font-extrabold uppercase tracking-[0.08em] opacity-85 truncate">CREATE · {child.full_name}</p>
            <h1 className="font-ninja font-extrabold text-[34px] lg:text-[42px] leading-none mt-1.5 tracking-[-0.02em]">Sticker book</h1>
            <p className="font-ninja text-[13px] opacity-85 mt-2">
              {earned === 0
                ? `Every sticker ${first} can earn in CREATE, all ${total} of them.`
                : `${earned} of ${total} earned. Tap any one to see what it took.`}
            </p>

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
          <div className="space-y-4 lg:space-y-5">
            {STICKER_BELTS.map((name) => (
              <BeltPage key={name} belt={name} progress={progress} onOpen={open} flat={flat} rarity={rarity} />
            ))}
          </div>
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
