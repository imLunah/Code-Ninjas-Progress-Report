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

// Robotics and JR run several kits; AI Academy is one straight line. Grouping
// by track only when there IS one keeps a single heading off a page that has
// nothing to distinguish under it.
function byTrack(stickers) {
  const groups = [];
  const at = new Map();
  for (const s of stickers) {
    const key = s.subProgram || '';
    if (!at.has(key)) { at.set(key, groups.length); groups.push({ track: s.subProgram, items: [] }); }
    groups[at.get(key)].items.push(s);
  }
  return groups;
}

export default function ModuleStickerBook({ program, logs, curriculum, childName }) {
  const flat = useReducedMotion();
  const { zoomed, open, close } = useStickerZoom();

  const stickers = useMemo(() => stickersForProgram(program), [program]);
  const earned = useMemo(
    () => earnedModuleStickers({ program, logs, curriculum }),
    [program, logs, curriculum],
  );
  const progress = useMemo(() => {
    const out = {};
    for (const s of stickers) out[s.id] = moduleProgress({ sticker: s, logs, curriculum });
    return out;
  }, [stickers, logs, curriculum]);

  if (!stickers.length) return null;

  const groups = byTrack(stickers);
  const first = childName ? childName.split(' ')[0] : null;

  return (
    <Group className="relative">
      <div className="flex items-start justify-between gap-4 px-4 pb-3 pt-4 sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-ninja-navy">
            <SparklesIcon size={17} strokeWidth={2.5} aria-hidden />
            <h2 className="font-ninja text-[17px] font-extrabold">{program} stickers</h2>
          </div>
          <p className="mt-1 font-ninja text-[12.5px] text-ninja-muted">
            One for every module{first ? ` ${first} finishes` : ' finished'}. Tap one to open it.
          </p>
        </div>
        <div className="flex-shrink-0 whitespace-nowrap pt-0.5 font-ninja text-[12px] font-extrabold text-ninja-blue">
          {earned.size} of {stickers.length} earned
        </div>
      </div>

      {groups.map((g) => (
        <div key={g.track || program}>
          {g.track && (
            <p className="px-4 pb-2 pt-1 font-ninja text-[11px] font-extrabold uppercase tracking-[0.08em] text-ninja-muted sm:px-5">
              {g.track}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2.5 px-3 pb-3 sm:grid-cols-3 sm:px-4 lg:grid-cols-5">
            {g.items.map((item) => (
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
        </div>
      ))}

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
