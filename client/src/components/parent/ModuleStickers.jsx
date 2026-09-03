import { useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { SparklesIcon } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { StickerCard, StickerZoom, useStickerZoom } from './StickerCollection';
import { Group } from './ParentUI';
import { stickersForProgram } from '../../lib/moduleStickers';
import { earnedModuleStickers, moduleProgress, moduleEarnedOn } from '../../lib/moduleStickerProgress';
import { fmtDay } from '../../lib/parentProgress';

// The sticker book for JR, Robotics Academy and AI Academy: one per module.
//
// It reuses CREATE's card and zoom rather than copying them, which is why
// those two grew a `requirement` prop. What it does NOT reuse is rarity: that
// is computed from a cohort of CREATE belts, and there is no equivalent
// reading for "how many ninjas finished VEX GO module 2" — so the chip is
// simply absent rather than filled with a number nobody measured.
//
// STICKERS, NOT ACHIEVEMENTS, in the words on screen as well as in the data.
// CREATE's badges are real Code Ninjas achievements awarded in MakeCode;
// these are DojoLink's own, one per module, and calling them achievements
// would claim a thing the franchise never awarded.

// A locked card says how far in they are, which is knowable here and more use
// than a static sentence. "0 of 10 lessons" on a module nobody has started is
// still the truth, and it reads as a start line rather than a failure.
function requirementFor({ done, total }) {
  if (!total) return 'Not in the curriculum yet';
  return `${done} of ${total} lesson${total === 1 ? '' : 's'}`;
}

// Which stickers belong to the kit the page is currently open on.
//
// AI Academy has no kits, so trackModel names its single track after the
// program itself and these stickers carry a null subProgram — hence the
// second arm. Anything unrecognised shows the lot rather than nothing,
// because an empty book is a worse answer than a long one.
function inTrack(stickers, track, program) {
  if (!track) return stickers;
  const scoped = stickers.filter((s) => (s.subProgram ? s.subProgram === track : track === program));
  return scoped.length ? scoped : stickers;
}

export default function ModuleStickerBook({ program, track, logs, curriculum }) {
  const flat = useReducedMotion();
  const { zoomed, open, close } = useStickerZoom();

  const all = useMemo(() => stickersForProgram(program), [program]);
  const earned = useMemo(
    () => earnedModuleStickers({ program, logs, curriculum }),
    [program, logs, curriculum],
  );
  const progress = useMemo(() => {
    const out = {};
    for (const s of all) out[s.id] = moduleProgress({ sticker: s, logs, curriculum });
    return out;
  }, [all, logs, curriculum]);

  // ONE KIT AT A TIME, the way the CREATE book shows one belt at a time.
  // Robotics has 18 modules across four kits, and all of them at once is a
  // wall of grey padlocks that says nothing about where the ninja is. The
  // page already has a kit open above this; the book follows it.
  const stickers = inTrack(all, track, program);
  if (!stickers.length) return null;

  const earnedHere = stickers.filter((s) => earned.has(s.id)).length;

  // Heading and count, and nothing else. The line that used to sit under it
  // explained what a sticker book is to somebody already looking at one, and
  // repeated a number the count on the right was already giving.
  return (
    <Group className="relative">
      <div className="flex items-center justify-between gap-4 px-4 pb-3 pt-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-2 text-ninja-navy">
          <SparklesIcon size={17} strokeWidth={2.5} aria-hidden className="flex-shrink-0" />
          <h2 className="truncate font-ninja text-[17px] font-extrabold">{track || program} stickers</h2>
        </div>
        <div className="flex-shrink-0 whitespace-nowrap font-ninja text-[12px] font-extrabold text-ninja-blue">
          {earnedHere} of {stickers.length} earned
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 px-3 pb-3 sm:grid-cols-3 sm:px-4 lg:grid-cols-5">
        {stickers.map((item) => (
          <StickerCard
            key={item.id}
            item={item}
            isEarned={earned.has(item.id)}
            onOpen={open}
            flat={flat}
            requirement={requirementFor(progress[item.id] || {})}
          />
        ))}
      </div>

      <AnimatePresence>
        {zoomed && (
          <StickerZoom
            key={zoomed.id}
            item={zoomed}
            isEarned={earned.has(zoomed.id)}
            onClose={close}
            flat={flat}
            requirement={requirementFor(progress[zoomed.id] || {})}
            // The block CREATE fills with the level's topic and quest. A
            // module has neither, so it gets what a module does have: the kit
            // it belongs to, how many lessons are in it, and the day it was
            // finished. That last one is readable here, unlike in the CREATE
            // book, because a module is finished by a session DojoLink saw.
            detail={(() => {
              const p = progress[zoomed.id] || {};
              const on = earned.has(zoomed.id) ? moduleEarnedOn({ sticker: zoomed, logs }) : null;
              return {
                label: zoomed.subProgram || zoomed.program,
                topic: p.total ? `${p.total} lesson${p.total === 1 ? '' : 's'}` : 'Not in the curriculum yet',
                quest: on ? `Finished ${fmtDay(on)}` : null,
              };
            })()}
          />
        )}
      </AnimatePresence>
    </Group>
  );
}
