import { useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { SparklesIcon } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { StickerCard, StickerZoom, useStickerZoom } from './StickerCollection';
import { Group } from './ParentUI';
import { programStickers } from '../../lib/stickerBook';
import { fmtDay } from '../../lib/parentProgress';

// The sticker book for JR, Robotics Academy and AI Academy: one badge per
// MODULE, and one per LESSON underneath it.
//
// It reuses CREATE's card and zoom rather than copying them, which is why
// those two grew a `requirement` prop. What it does NOT reuse is rarity: that
// is computed from a cohort of CREATE belts, and there is no equivalent
// reading for "how many ninjas finished VEX GO module 2" — so the chip is
// simply absent rather than filled with a number nobody measured.
//
// STICKERS, NOT ACHIEVEMENTS, in the words on screen as well as in the data.
// CREATE's badges are real Code Ninjas achievements awarded in MakeCode; these
// are DojoLink's own and calling them achievements would claim a thing the
// franchise never awarded.
//
// THE LIST COMES FROM lib/stickerBook.js, not from here. It is the same
// assembly the whole sticker book uses, sliced to one program, so a badge
// cannot read earned on this page and locked in the book. Everything a card
// needs — earned, the day, the locked line, the zoom's detail block — is
// already on the item by the time it arrives.

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

export default function ModuleStickerBook({ program, track, logs, curriculum, subPrograms }) {
  const flat = useReducedMotion();
  const { zoomed, open, close } = useStickerZoom();

  const all = useMemo(
    () => programStickers({ programs: program, logs, curriculum, subPrograms }),
    [program, logs, curriculum, subPrograms],
  );

  // ONE KIT AT A TIME, the way the CREATE book shows one belt at a time.
  // Robotics has 18 modules across four kits, and all of them at once is a
  // wall of grey padlocks that says nothing about where the ninja is. The
  // page already has a kit open above this; the book follows it.
  const stickers = inTrack(all, track, program);
  if (!stickers.length) return null;

  const earnedHere = stickers.filter((s) => s.earned).length;

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
            isEarned={item.earned}
            onOpen={open}
            flat={flat}
            requirement={item.requirement}
            earnedLabel={item.earnedOn ? fmtDay(item.earnedOn) : undefined}
          />
        ))}
      </div>

      <AnimatePresence>
        {zoomed && (
          <StickerZoom
            key={zoomed.id}
            item={zoomed}
            isEarned={zoomed.earned}
            onClose={close}
            flat={flat}
            requirement={zoomed.requirement}
            // The block CREATE fills with the level's topic and quest. These
            // have neither, so they carry what they do have — the kit, and
            // either the lessons in the module or the module a lesson sits in
            // — and the day it landed, which is readable here unlike in the
            // CREATE book because both are finished by a session DojoLink saw.
            detail={{ ...zoomed.detail, quest: zoomed.earnedOn ? `Finished ${fmtDay(zoomed.earnedOn)}` : null }}
          />
        )}
      </AnimatePresence>
    </Group>
  );
}
