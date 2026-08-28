import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { CheckIcon, LockKeyholeIcon, SparklesIcon, XIcon } from 'lucide-react';
import { CREATE_STICKERS, STICKER_BELTS, stickerRequirement, stickersForBelt } from '../../lib/createStickers';
import { levelInfo } from '../../lib/createCurriculum';
import { Group } from './ParentUI';
import ModalPortal from '../ui/ModalPortal';

// CREATE's belt artwork as a sticker album, one tab per belt.
//
// The artwork is a physical thing: die-cut, white-rimmed, the kind of sticker
// that ends up on a water bottle. So the cards behave like one. A card tilts
// under the pointer on a real 3D perspective and the sticker itself floats
// above the card on its own Z plane, which is what sells the depth: without
// the translateZ the tilt reads as a flat card being skewed. A light catches
// the surface where the pointer is, the same way it would on vinyl.
//
// Clicking a sticker zooms it. The image is one element with a shared
// `layoutId`, so framer flies the actual sticker off the card and into the
// dialog rather than cross-fading a copy of it. Two rules keep that honest:
// the tilt springs are jumped back to flat on pointer down (a layout
// animation measures a rotated box wrong), and the dialog panel fades without
// scaling (a scaling ancestor distorts the child mid-flight).
//
// Everything here is decoration until it isn't: with prefers-reduced-motion
// the tilt, the float and the flight are all skipped and the dialog simply
// appears.

const TILT = 13;
const SPRING = { type: 'spring', stiffness: 320, damping: 26, mass: 0.5 };
const CARD_SPRING = { stiffness: 260, damping: 20, mass: 0.4 };

// The poster's name for each level a sticker covers ("Nested Block
// Statements!"), so the dialog can show the syllabus behind the sentence.
function stickerTopics(item) {
  return item.levels
    .map((level) => ({ level, topic: levelInfo(item.belt, level)?.topic }))
    .filter((entry) => entry.topic);
}

function StickerCard({ item, isEarned, onOpen, flat }) {
  const rotateX = useSpring(0, CARD_SPRING);
  const rotateY = useSpring(0, CARD_SPRING);
  const lift = useSpring(0, CARD_SPRING);
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(50);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.85), rgba(255,255,255,0) 62%)`;
  // The sticker rides above the card on its own Z plane, and rides back down
  // on press. Nothing with a `layoutId` may be sitting on a perspective scale
  // when the zoom measures it, and translateZ is a scale.
  const artZ = useTransform(lift, [0, 1], [0, 64]);
  const badgeZ = useTransform(lift, [0, 1], [0, 34]);
  const inkZ = useTransform(lift, [0, 1], [0, 18]);
  const scale = useTransform(lift, [0, 1], [1, 1.035]);

  const onPointerMove = (e) => {
    if (flat || e.pointerType === 'touch') return;
    const box = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - box.left) / box.width;
    const py = (e.clientY - box.top) / box.height;
    rotateY.set((px - 0.5) * TILT * 2);
    rotateX.set((0.5 - py) * TILT * 2);
    lift.set(1);
    glareX.set(px * 100);
    glareY.set(py * 100);
  };

  const rest = () => {
    rotateX.set(0);
    rotateY.set(0);
    lift.set(0);
  };

  // Flatten instantly, not over a spring: the click that follows measures
  // this card for the zoom, and a box still mid-tilt measures skewed.
  const flatten = () => {
    rotateX.jump(0);
    rotateY.jump(0);
    lift.jump(0);
  };

  return (
    <motion.button
      type="button"
      onClick={() => onOpen(item)}
      onPointerMove={onPointerMove}
      onPointerLeave={rest}
      onPointerDown={flatten}
      onBlur={rest}
      aria-label={`${item.title}, ${isEarned ? 'earned' : stickerRequirement(item)}`}
      style={{ rotateX, rotateY, scale, transformPerspective: 800, transformStyle: 'preserve-3d', background: isEarned ? 'rgb(var(--ninja-blue) / 0.045)' : 'rgb(var(--ninja-navy) / 0.025)' }}
      className="group relative flex min-h-[184px] flex-col items-center rounded-[18px] border border-ninja-navy/[0.07] px-3 pb-3 pt-4 text-center transition-shadow duration-200 hover:shadow-[0_22px_36px_-20px_rgb(6_13_26_/_0.55)] active:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ninja-blue/60"
    >
      {/* The light on the sticker's surface. Earned only: a locked sticker is
          greyed out and a shine on grey just looks like a smudge. */}
      {isEarned && !flat && (
        <motion.span
          aria-hidden="true"
          style={{ backgroundImage: glare, opacity: lift }}
          className="pointer-events-none absolute inset-0 rounded-[18px] mix-blend-soft-light"
        />
      )}
      <div className="relative flex h-[88px] w-full items-center justify-center" style={{ transformStyle: 'preserve-3d' }}>
        <motion.span style={flat ? undefined : { z: artZ }} className="inline-flex">
          <motion.img
            layoutId={flat ? undefined : `sticker-art-${item.id}`}
            src={item.src}
            alt=""
            aria-hidden="true"
            draggable={false}
            className={`h-[82px] w-[82px] select-none object-contain ${isEarned ? 'drop-shadow-[0_8px_9px_rgb(6_13_26_/_0.16)]' : 'grayscale opacity-25'}`}
          />
        </motion.span>
        <motion.span
          aria-hidden="true"
          style={flat ? undefined : { z: badgeZ }}
          className={`absolute right-0 top-0 inline-flex h-7 w-7 items-center justify-center rounded-full text-white shadow-sm ${isEarned ? 'bg-emerald-500' : 'bg-ninja-navy/55'}`}
        >
          {isEarned
            ? <CheckIcon size={15} strokeWidth={3.2} />
            : <LockKeyholeIcon size={14} strokeWidth={2.6} />}
        </motion.span>
      </div>
      <motion.p style={flat ? undefined : { z: inkZ }} className={`mt-2 font-ninja text-[13.5px] font-extrabold leading-tight ${isEarned ? 'text-ninja-navy' : 'text-ninja-navy/55'}`}>
        {item.title}
      </motion.p>
      <p className={`mt-1 font-ninja text-[11px] leading-snug ${isEarned ? 'font-bold text-emerald-600' : 'text-ninja-muted'}`}>
        {isEarned ? 'Earned' : stickerRequirement(item)}
      </p>
    </motion.button>
  );
}

function StickerZoom({ item, isEarned, childName, onClose, flat }) {
  const closeRef = useRef(null);
  const topics = stickerTopics(item);
  const who = childName ? String(childName).split(' ')[0] : null;

  // Escape closes, and Tab stays inside: the sticker album behind this is a
  // long grid of buttons, and a dialog you can tab out of leaves a keyboard
  // clicking things it cannot see. The panel holds one button, so the trap is
  // just "keep it here" rather than the cycle Modal.jsx runs.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        closeRef.current?.focus();
        return;
      }
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    document.addEventListener('keydown', onKeyDown);
    const scroll = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = scroll;
    };
  }, [onClose]);

  return (
    <ModalPortal>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        className="fixed inset-0 z-[120] flex items-center justify-center bg-ninja-navy/50 p-4 backdrop-blur-[3px]"
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={item.title}
          // Opacity only. A panel that scales would drag the sticker's
          // shared-element flight out of shape on the way in.
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="relative w-full max-w-[400px] rounded-[26px] bg-white p-6 pt-8 text-center shadow-[0_30px_70px_-20px_rgb(6_13_26_/_0.5)]"
        >
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-ninja-muted transition-colors hover:bg-ninja-navy/[0.06] hover:text-ninja-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ninja-blue/60"
          >
            <XIcon size={18} strokeWidth={2.6} />
          </button>

          <motion.img
            layoutId={flat ? undefined : `sticker-art-${item.id}`}
            initial={flat ? { scale: 0.7, opacity: 0 } : undefined}
            animate={flat ? { scale: 1, opacity: 1 } : undefined}
            transition={SPRING}
            src={item.src}
            alt=""
            aria-hidden="true"
            draggable={false}
            className={`mx-auto h-[172px] w-[172px] select-none object-contain ${isEarned ? 'drop-shadow-[0_18px_22px_rgb(6_13_26_/_0.22)]' : 'grayscale opacity-30'}`}
          />

          <h3 className="mt-4 font-ninja text-[21px] font-extrabold leading-tight text-ninja-navy">{item.title}</h3>

          <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-ninja text-[11.5px] font-extrabold ${isEarned ? 'bg-emerald-500/12 text-emerald-600' : 'bg-ninja-navy/[0.06] text-ninja-muted'}`}>
            {isEarned ? <CheckIcon size={13} strokeWidth={3.2} /> : <LockKeyholeIcon size={12} strokeWidth={2.6} />}
            {isEarned ? 'Earned' : 'Not earned yet'}
          </span>

          {/* The blurb is written in the past tense, as the account of a thing
              that happened, so it only belongs on a sticker that has been
              earned. A locked one gets the requirement instead, and the level
              topics below still say what is coming. */}
          <p className="mt-1.5 font-ninja text-[11px] font-extrabold uppercase tracking-[0.08em] text-ninja-muted">
            {isEarned ? (who ? `What ${who} did` : 'What they did') : 'How to earn it'}
          </p>
          <p className="mt-1.5 font-ninja text-[13.5px] leading-relaxed text-ninja-navy/85">
            {isEarned ? item.blurb : stickerRequirement(item)}
          </p>

          {topics.length > 0 && (
            <div className="mt-4 rounded-[16px] px-4 py-3 text-left" style={{ background: 'rgb(var(--ninja-blue) / 0.06)' }}>
              <p className="font-ninja text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-ninja-blue">
                {item.belt} belt · {topics.length === 1 ? 'Level' : 'Levels'} {topics.map((t) => t.level).join(' and ')}
              </p>
              <ul className="mt-1 space-y-0.5">
                {topics.map((t) => (
                  <li key={t.level} className="font-ninja text-[12.5px] font-bold text-ninja-navy/80">{t.topic}</li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      </motion.div>
    </ModalPortal>
  );
}

export default function StickerCollection({ belt, earnedIds, earnedTotal, childName }) {
  const firstBelt = STICKER_BELTS.includes(belt) ? belt : STICKER_BELTS[STICKER_BELTS.length - 1];
  const [openBelt, setOpenBelt] = useState(firstBelt);
  const [zoomed, setZoomed] = useState(null);
  const opener = useRef(null);
  const flat = useReducedMotion();

  useEffect(() => {
    if (STICKER_BELTS.includes(belt)) setOpenBelt(belt);
  }, [belt]);

  const stickers = stickersForBelt(openBelt);

  const open = useCallback((item) => {
    opener.current = document.activeElement;
    setZoomed(item);
  }, []);

  // Hand focus back to the card that opened the dialog, not the top of the
  // page, once the sticker has flown home.
  const close = useCallback(() => {
    setZoomed(null);
    const el = opener.current;
    if (el && typeof el.focus === 'function' && document.contains(el)) el.focus();
  }, []);

  return (
    <Group className="relative">
      <div className="flex items-start justify-between gap-4 px-4 pb-3 pt-4 sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-ninja-navy">
            <SparklesIcon size={17} strokeWidth={2.5} aria-hidden />
            <h2 className="font-ninja text-[17px] font-extrabold">Stickers</h2>
          </div>
          <p className="mt-1 font-ninja text-[12.5px] text-ninja-muted">
            Complete levels to earn each sticker. Tap one to see what it took.
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
        {stickers.map((item) => (
          <StickerCard
            key={item.id}
            item={item}
            isEarned={earnedIds.has(item.id)}
            onOpen={open}
            flat={flat}
          />
        ))}
      </div>

      <AnimatePresence>
        {zoomed && (
          <StickerZoom
            key={zoomed.id}
            item={zoomed}
            isEarned={earnedIds.has(zoomed.id)}
            childName={childName}
            onClose={close}
            flat={flat}
          />
        )}
      </AnimatePresence>
    </Group>
  );
}
