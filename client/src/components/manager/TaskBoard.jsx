import { useState, useRef, useCallback, useEffect, useMemo, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArchiveRestoreIcon, ArrowLeftIcon, ArrowRightIcon,
  ChevronLeftIcon, ChevronRightIcon, PlusIcon, Trash2Icon,
} from 'lucide-react';
import TaskCardFace from './TaskCardFace';
import { CARD } from '../../lib/surfaces';
import {
  COLUMNS,
  COLUMN_KEYS,
  COLUMN_LABEL,
  groupByColumn,
  moveTask,
  TASK_SURFACE,
} from '../../lib/taskBoard';

const EASE = [0.23, 1, 0.32, 1];

// The overshoot, kept for the moment a card is let go of and nowhere else.
// While a card is under the pointer the board is answering a question — the gap
// opening ahead of it is information, and information that wobbles is harder to
// read. Once the card is dropped the question is settled, and the overshoot is
// what settling sounds like.
const SETTLE_EASE = [0.34, 1.56, 0.64, 1];
const SETTLE_MS = 420;

// How long the dropped card takes to travel into the bin, and how long a card
// deleted from anywhere else takes to shrink out of its column. Both are the
// same beat, so deleting looks like one thing however it was asked for.
const TRASH_MS = 200;

// And how long the card takes to stop being a card. Longer than the plain
// delete: there is a shape change to watch here, and 200ms is not enough of it
// to read as anything but a disappearance.
const SWALLOW_MS = 520;

// How near the bin a card has to be before the red starts reaching for it, and
// how much blur the goo filter has to work with. The two are related: the
// stretch only forms while the gap between two blobs is within a couple of
// standard deviations, which is what the droplet in between is for.
const GOO_REACH = 260;

// The bin is the gutter to the RIGHT of the last column — the track In review
// used to occupy, which the grid still reserves. It went there when the board
// dropped to three columns: the left margin belongs to the nav, and how wide it
// was depended on whether the sidebar happened to be open, so a collapsed
// sidebar put the red inside the To do column. The space past Done belongs to
// nothing and does not move.
//
// Measured off the last column's own rect, not off the window or the grid: the
// grid stretches the full width whether it has three children or four, so its
// right edge says nothing about where the columns actually stop.
const TRASH_MIN_W = 88;   // never thinner than this, even on a cramped window
const TRASH_MAX_W = 148;  // and never wider, however much room the track leaves
const TRASH_GAP = 12;     // breathing room between the last column and the band
const ARM_AT = 1 / 3;     // how much of the card has to be in before it commits

// The goo filter blurs everything it is given and then cuts the result back to
// a hard edge, which rounds every corner it finds. Given a rectangle the size of
// the screen's left edge, the rounding happens ON the screen and the band pulls
// away from the corners. So the pool is drawn larger than the area it has to
// cover and hangs off all three edges: the rounding still happens, out of sight.
const BLEED = 100;

// Solid across the band, then away to nothing over the reach, so the red thins
// out towards the board instead of ending on a line. Measured from the layer's
// own left edge, which starts a bleed to the left of the window's, and built
// per drag now that the band's width is whatever the gutter turned out to be.
const maskFor = (w) =>
  `linear-gradient(to left, rgb(0 0 0) 0px, rgb(0 0 0) ${BLEED + w * 0.7}px, rgb(0 0 0 / 0) ${BLEED + w + GOO_REACH}px)`;

// Vertical rhythm between cards. The drop maths has to know it, because the
// space a lifted card frees up is its own height plus one gap.
const GAP = 12; // matches space-y-3

// How far the pointer travels before a press becomes a drag. Below this it is
// a click, and the card opens instead of moving.
const DRAG_THRESHOLD = 5;

// Drag is a pointer affordance with no keyboard or touch equivalent, so it is
// only ever the *fast* way to move a card — never the only way. The two arrows
// on every card do the same job a press at a time, which is what makes the
// board usable on a phone and with a keyboard. Below this width the columns
// wrap, and wrapped columns share the x axis the drop target is read from, so
// dragging is switched off rather than left to guess. The columns only sit in
// one row at xl, which is why this tracks the grid's last breakpoint and must
// move with it.
const DRAG_MIN_WIDTH = 1280;

function useDragEnabled() {
  const [ok, setOk] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(`(min-width: ${DRAG_MIN_WIDTH}px)`).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${DRAG_MIN_WIDTH}px)`);
    const on = (e) => setOk(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return ok;
}

/* --------------------------------------------------------- swipe away -- */

// A card can be pushed sideways with the pointer: right moves it on to the next
// stage, left moves it back to the one before. The stage a card is at is the
// only thing about it that changes daily, so the gesture nearest to hand is the
// one that changes it, and it is symmetrical because moving a card on and
// moving it back are the same mistake in opposite directions.
//
// Deleting is behind a hold. Press and wait and the card arms: both sides turn
// red and read Delete, and the same push then throws it away instead of moving
// it. It costs half a second on purpose — the gesture that empties the board
// should not be the gesture that organises it, one pixel apart. The card is
// deleted into Recently deleted either way, so a hold nobody meant is a card
// that comes back.
//
// Offered only where the reorder drag is not — below xl, or while Recently
// deleted is open. Both read a horizontal pull, and on a board whose columns
// sit side by side that pull already means "move this to In progress". One axis,
// one meaning, decided by which mode the board is in. Which leaves the gesture
// exactly where it is worth most: the phone, where dragging is off.
const DISMISS_AT = 100;  // px of travel past which release acts on the card
const SWIPE_START = 8;   // px before a press counts as a swipe rather than a tap
const HOLD_MS = 450;     // press held still for this long arms the card for deletion
const MAX_TILT = 7;      // deg at the far end of the pull
const FLING_MS = 240;
const SETTLE = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Resting at half strength so the card's own words stay the loudest thing on
// it, the way the sticky notes' actions do. The name is in `title` and
// `aria-label` both, because a glyph that only speaks on hover says nothing on
// a phone and nothing to a screen reader.
function CardButton({ onClick, disabled, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors duration-150 ${
        disabled
          ? 'text-ninja-muted/30 cursor-default'
          : 'text-ninja-muted opacity-60 hover:opacity-100 hover:text-ninja-blue hover:bg-ninja-blue/10'
      }`}
    >
      {children}
    </button>
  );
}

/* --------------------------------------------------------------- card -- */

function TaskCard({ task, canManage, grabbable, swipeable, settling, landed, leaving, onOpen, onDelete, onRestore, onMoveTo, cardRef, onPointerDown, onSwipeStart }) {
  const reduce = useReducedMotion();
  const faceRef = useRef(null);
  const aheadRef = useRef(null);   // revealed by a pull to the right
  const backRef = useRef(null);    // revealed by a pull to the left
  const flung = useRef(false);
  const timer = useRef(null);
  const holdTimer = useRef(null);
  // Armed by a held press: the sides go red and the push deletes. State rather
  // than a written class, because the labels change with it and rendering that
  // twice by hand is how the two get to disagree. It changes once per gesture,
  // not once per frame.
  const [armed, setArmed] = useState(false);
  const armedRef = useRef(false);
  const arm = (on) => {
    armedRef.current = on;
    // Cleared so the keyframe can play again. A swipe turns the animation off
    // outright (see `paint`), and that `none` would otherwise still be sitting
    // on the node the next time the card is held.
    if (on && faceRef.current) faceRef.current.style.animation = '';
    setArmed(on);
  };

  useEffect(() => () => { clearTimeout(timer.current); clearTimeout(holdTimer.current); }, []);

  // The stage before and the stage after, which is the whole of what the arrows
  // and the swipe can do. The last column has nowhere to go, so a card in it
  // takes a rightward pull and gives it back rather than inventing a stage.
  const at = COLUMN_KEYS.indexOf(task.column_key);
  const prevKey = at > 0 ? COLUMN_KEYS[at - 1] : null;
  const nextKey = COLUMN_KEYS[at + 1] || null;
  const archived = Boolean(task.archived_at);
  // Armed, both directions are the same direction, so a card at either end of
  // the board can still be thrown away whichever way the hand goes.
  const canRight = Boolean(swipeable && (armed || nextKey));
  const canLeft = Boolean(swipeable && (armed || prevKey));

  // Written straight to the node. A setState per pointermove would re-render
  // every card in the column for the length of the gesture, which is the same
  // reason the reorder drag moves its overlay by hand.
  const paint = (dx) => {
    const face = faceRef.current;
    if (!face) return;
    const tilt = reduce ? '' : ` rotate(${clamp(dx / 26, -MAX_TILT, MAX_TILT)}deg)`;
    // An animation outranks an inline transform for as long as it is running,
    // so the arming keyframe has to be called off before the swipe can move the
    // card. Its final size is carried on by hand instead, and the card stays
    // proud of the column all the way across.
    const lift = armedRef.current ? ' scale(1.03)' : '';
    face.style.animation = 'none';
    face.style.transition = 'none';
    face.style.transform = `translate3d(${dx}px, 0, 0)${tilt}${lift}`;
    face.style.opacity = String(1 - Math.min(Math.abs(dx) / 340, 0.55));

    // Only the side being pulled towards is lit, so the card is never offering
    // two answers at once. The lit one reaches full strength exactly at the
    // threshold: "I can read it" and "letting go does this" are the same moment,
    // and nothing else marks a line that is otherwise crossed by accident.
    const p = Math.min(Math.abs(dx) / DISMISS_AT, 1);
    const fade = (el, lit) => {
      if (!el) return;
      el.style.transition = 'none';
      el.style.opacity = lit ? String(p) : '0';
      el.style.transform = `scale(${0.97 + (lit ? p : 0) * 0.03})`;
    };
    fade(aheadRef.current, dx > 0);
    fade(backRef.current, dx < 0);
  };

  const hide = (ms) => {
    for (const el of [aheadRef.current, backRef.current]) {
      if (el) { el.style.transition = `opacity ${ms}ms ease-out`; el.style.opacity = '0'; }
    }
  };

  const settle = (dx) => {
    const face = faceRef.current;
    if (!face) return;

    const right = dx > 0;
    // A pull towards a stage that isn't there has nothing to act on, so it is
    // treated as a pull that never got far enough.
    const acts = Math.abs(dx) >= DISMISS_AT && (right ? canRight : canLeft);

    if (acts) {
      flung.current = true;
      const away = Math.sign(dx) * (window.innerWidth + 240);
      face.style.pointerEvents = 'none';
      face.style.transition = reduce
        ? 'opacity 160ms linear'
        : `transform ${FLING_MS}ms var(--ease-out), opacity ${FLING_MS}ms linear`;
      if (!reduce) face.style.transform = `translate3d(${away}px, 0, 0) rotate(${Math.sign(dx) * MAX_TILT}deg)`;
      face.style.opacity = '0';
      hide(160);
      // The card is gone from the screen before it is gone from the column, so
      // the board closes the gap behind something that has already left.
      const act = armedRef.current
        ? () => onDelete(task)
        : () => onMoveTo(task, right ? nextKey : prevKey);
      timer.current = setTimeout(act, reduce ? 150 : FLING_MS - 40);
      return;
    }

    face.style.transition = `transform 420ms ${SETTLE}, opacity 200ms ease-out`;
    face.style.transform = 'translate3d(0, 0, 0)';
    face.style.opacity = '1';
    hide(220);
    // Handed back once it has landed. A card left holding a transform is a
    // containing block for anything positioned inside it, and this one is
    // holding a menu.
    timer.current = setTimeout(() => {
      if (!faceRef.current) return;
      faceRef.current.style.transition = '';
      faceRef.current.style.transform = '';
      faceRef.current.style.opacity = '';
      faceRef.current.style.animation = '';
    }, 460);
  };

  const startSwipe = (e) => {
    if (!swipeable || flung.current) return;
    if (e.button !== 0) return;
    if (e.target.closest('[data-no-drag]')) return;

    const startX = e.clientX;
    const startY = e.clientY;
    let live = false;

    // Held still for half a second and the card arms for deletion. Cancelled by
    // the first sign of a swipe below, so the two never race: a press that
    // moves is somebody sorting the board, and a press that waits is somebody
    // asking for the other thing.
    clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => {
      arm(true);
      // The one moment on this board worth a tap on the wrist, since the card
      // has not moved and there is nothing else to say it changed meaning.
      if (navigator.vibrate) navigator.vibrate(12);
    }, HOLD_MS);

    // On the document rather than the card: a pointer that leaves the card
    // mid-swipe is still swiping, and a card that unmounts under a capture
    // would strand the gesture.
    const detach = () => {
      clearTimeout(holdTimer.current);
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', cancel);
      document.body.style.userSelect = '';
      if (faceRef.current) faceRef.current.style.willChange = '';
    };

    const move = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!live) {
        // Any real movement is a swipe and not a hold, so the hold stops
        // counting the moment the hand does anything.
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) clearTimeout(holdTimer.current);
        // Whichever axis commits first wins the gesture. A pull that goes down
        // the page is the page scrolling and must be handed straight back.
        if (Math.abs(dx) < SWIPE_START) {
          if (Math.abs(dy) > SWIPE_START) { detach(); arm(false); }
          return;
        }
        if (Math.abs(dx) < Math.abs(dy)) { detach(); arm(false); return; }
        live = true;
        onSwipeStart?.();
        document.body.style.userSelect = 'none';
        if (faceRef.current) faceRef.current.style.willChange = 'transform, opacity';
      }
      paint(dx);
    };

    // Armed only for as long as the finger is down. A card left red after a
    // press would be a card that deletes itself the next time it is nudged.
    const up = (ev) => {
      detach();
      if (live) settle(ev.clientX - startX);
      arm(false);
    };
    const cancel = () => { detach(); if (live) settle(0); arm(false); };

    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', cancel);
  };

  return (
    <motion.div
      ref={cardRef}
      // The cards that aren't being held animate to their new places as the
      // gap opens and closes under the held one. That reflow IS the feedback —
      // it's what tells you where the card will land before you let go.
      layout={reduce ? false : 'position'}
      // Mid-drag the cards make room in a plain ease. The overshoot is switched
      // on for the length of the landing and then switched off again, so it is
      // only ever the sound of a card being let go of.
      transition={settling ? { duration: SETTLE_MS / 1000, ease: SETTLE_EASE } : { duration: 0.2, ease: EASE }}
      onPointerDown={(e) => { onPointerDown(e); startSwipe(e); }}
      // The wrapper carries the layout animation and nothing else. The surface
      // moved inside it so the swipe has a transform of its own to write:
      // framer owns `transform` on a motion element, and the two would fight
      // over the same property on the same node.
      data-no-swipe
      className="relative"
    >
      {/* Each label sits on the side the card uncovers as it goes the other
          way, which is where a hand pushing right is already looking. Armed,
          both of them say the same thing, because armed there is only one
          thing either direction can do.

          A moving card is a label and nothing else. It thins as it travels, so
          anything laid behind it comes up THROUGH it, and a card washing blue
          on the way to the next column reads as the card changing rather than
          the column it is going to. Armed keeps its tint: red coming up through
          a card that is about to be thrown away is the warning doing its job.
          That tint is the brand red at a tenth and not `bg-red-50`, which
          index.css overrides to plum in dark with `!important`. */}
      {canRight && (
        <div
          ref={aheadRef}
          aria-hidden="true"
          className={`absolute inset-0 rounded-2xl flex items-center justify-start px-5 opacity-0 pointer-events-none ${
            armed ? 'bg-ninja-red/10' : ''
          }`}
        >
          <span className={`flex items-center gap-1.5 font-ninja text-xs font-bold ${
            armed ? 'text-ninja-red' : 'text-ninja-blue-ink'
          }`}>
            {armed ? <Trash2Icon size={14} strokeWidth={2.25} /> : <ArrowRightIcon size={14} strokeWidth={2.25} />}
            {armed ? 'Delete' : COLUMN_LABEL[nextKey]}
          </span>
        </div>
      )}

      {canLeft && (
        <div
          ref={backRef}
          aria-hidden="true"
          className={`absolute inset-0 rounded-2xl flex items-center justify-end px-5 opacity-0 pointer-events-none ${
            armed ? 'bg-ninja-red/10' : ''
          }`}
        >
          <span className={`flex items-center gap-1.5 font-ninja text-xs font-bold ${
            armed ? 'text-ninja-red' : 'text-ninja-blue-ink'
          }`}>
            {armed ? <Trash2Icon size={14} strokeWidth={2.25} /> : <ArrowLeftIcon size={14} strokeWidth={2.25} />}
            {armed ? 'Delete' : COLUMN_LABEL[prevKey]}
          </span>
        </div>
      )}

      <div
        ref={faceRef}
        // The whole card opens it, not just the words at the top. A card is one
        // thing and reads as one thing, so pressing the empty half of it and
        // getting nothing is the card saying it is two.
        //
        // Anything that already does something keeps doing it: the arrows, the
        // menu, the checkbox. And the title stays a real button underneath, so
        // this adds a way in for a pointer without taking the keyboard's away —
        // a div with role="button" wrapped around three other buttons announces
        // itself as one control containing controls, which is worse than what
        // it fixes.
        onClick={(e) => {
          if (!onOpen) return;
          if (e.target.closest('button, a, input, select, textarea, [data-no-drag]')) return;
          onOpen();
        }}
        // `pan-y` keeps the page scrolling vertically while the horizontal axis
        // is ours. `select-none` is for the hold: half a second on a phone is
        // also the browser's own idea of "select this text".
        style={swipeable ? { touchAction: 'pan-y', WebkitTouchCallout: 'none' } : undefined}
        // The dropped card is a fresh mount — it left the list the moment it was
        // lifted — so there is no position for it to animate from and it would
        // otherwise appear in its new slot fully formed while the board settles
        // around it. A keyframe rather than an inline transform: this card
        // re-renders on the same tick it lands, and a class survives that where
        // a written style would be overwritten by it.
        className={`${CARD} ${TASK_SURFACE} p-3.5 relative transition-shadow duration-150 ${
          grabbable ? 'cursor-grab' : ''
        } ${onOpen && !grabbable ? 'cursor-pointer' : ''} ${swipeable ? 'select-none' : ''} ${
          armed ? 'ring-2 ring-ninja-red task-armed z-10' : ''
        } ${landed && !reduce ? 'task-landing' : ''} ${
          // A card that has already been flung off the screen has an inline
          // transform holding it there, and an animation would outrank it and
          // bring the card back to shrink out in the middle of its column.
          leaving && !flung.current ? 'task-leaving' : ''
        }`}
      >
        <TaskCardFace
          task={task}
          onOpen={onOpen}
          actions={
            canManage && (
              // Two arrows in place of the menu that used to live here. Nearly
              // everything that menu held was a stage to move the card to, and
              // a card only ever has two of those: the one before and the one
              // after. The rest of it moved to the dialog the card opens.
              //
              // `data-no-drag` is the one part of the card a press must not
              // drag from, or the button would never survive long enough to be
              // pressed.
              <span data-no-drag className="flex items-center gap-0.5 flex-shrink-0 -mr-1.5 -mt-1">
                {archived ? (
                  <CardButton onClick={() => onRestore(task)} label="Put back on the board">
                    <ArchiveRestoreIcon size={15} strokeWidth={2.25} />
                  </CardButton>
                ) : (
                  <>
                    {/* Held rather than hidden at the ends: a card whose arrows
                        come and go with the column it is in makes the whole
                        row of them jump about as cards move. */}
                    <CardButton
                      onClick={() => onMoveTo(task, prevKey)}
                      disabled={!prevKey}
                      label={prevKey ? `Move to ${COLUMN_LABEL[prevKey]}` : 'Nothing before this stage'}
                    >
                      <ChevronLeftIcon size={16} strokeWidth={2.5} />
                    </CardButton>
                    <CardButton
                      onClick={() => onMoveTo(task, nextKey)}
                      disabled={!nextKey}
                      label={nextKey ? `Move to ${COLUMN_LABEL[nextKey]}` : 'Nothing after this stage'}
                    >
                      <ChevronRightIcon size={16} strokeWidth={2.5} />
                    </CardButton>
                  </>
                )}
              </span>
            )
          }
        />
      </div>
    </motion.div>
  );
}

/* -------------------------------------------------------------- board -- */

// `tasks` is the WHOLE board. Every mutation reads it, because moveTask
// restamps position across every column: handed a subset it would renumber the
// cards it could see and scramble the order of the ones it could not.
export default function TaskBoard({
  tasks, canManage, filtered = false, leavingId = null,
  onEdit, onDelete, onRestore, onReorder, onAdd, onQuickAdd, onClearDone,
}) {
  const wide = useDragEnabled();
  // A drag measures the gaps between the cards on screen. With cards hidden,
  // those gaps describe a board that isn't there.
  const dragEnabled = wide && !filtered;
  const reduce = useReducedMotion();
  const grouped = useMemo(() => groupByColumn(tasks), [tasks]);

  const colRefs = useRef({});
  const listRefs = useRef({});
  const cardRefs = useRef(new Map());
  const overlayRef = useRef(null);
  // The red under the bin panel, drawn as three blobs through a goo filter: the
  // pool over the nav, a bead on the card, and one droplet between them. Written
  // by hand on every pointermove for the same reason the overlay is — this is a
  // per-frame value, and state would re-render the board to carry it.
  const boardRef = useRef(null);
  const gooRef = useRef(null);
  const gooBeadRef = useRef(null);
  const gooDropRef = useRef(null);
  // Where the pointer was last, so the drop can send the card into the band at
  // the height it was let go of rather than at some fixed point on it.
  const lastPoint = useRef({ x: 0, y: 0 });

  // Geometry captured once, at the moment the press becomes a drag.
  //
  // Re-measuring as the pointer moves would read rects while the cards under it
  // are still animating into the gap, and the target would flicker between two
  // slots. The snapshot already accounts for the hole the lifted card leaves
  // behind, so the maths describes the board as it looks mid-drag without ever
  // having to measure it mid-animation.
  const snap = useRef(null);
  const info = useRef(null);      // { id, dx, dy, w, h }
  const targetRef = useRef(null);
  // pointerup is followed by a click on whatever was under it. After a drag
  // that click would open the editor for the card just dropped.
  const suppressClick = useRef(false);

  const [held, setHeld] = useState(null);   // the card drawn in the overlay
  const [target, setTarget] = useState(null);
  const [quickAdd, setQuickAdd] = useState({ key: null, text: '' });
  // The id of the card just dropped, held for as long as the board takes to
  // settle around it and then let go of.
  const [landing, setLanding] = useState(null);
  const landTimer = useRef(null);
  useEffect(() => () => clearTimeout(landTimer.current), []);

  const clearDrag = useCallback(() => {
    snap.current = null;
    info.current = null;
    targetRef.current = null;
    document.body.style.userSelect = '';
    setHeld(null);
    setTarget(null);
  }, []);

  useEffect(() => () => { document.body.style.userSelect = ''; }, []);

  const setTargetIfChanged = (next) => {
    const prev = targetRef.current;
    if (prev && prev.trash === next.trash && prev.key === next.key && prev.index === next.index) return;
    targetRef.current = next;
    setTarget(next);
  };

  // The card is what is being deleted, so the card is what has to arrive: the
  // bin takes it once a third of it is inside the band. Half meant pushing a
  // wide card most of the way off the screen before the red would commit.
  //
  // Not the pointer. Where the pointer sits on a card is an accident of where
  // it was picked up — grab a card by its left edge and a pointer test asks you
  // to drag the whole card off the screen before anything happens, while the
  // same drag on a card grabbed by its right edge fires early. The card's own
  // middle is in the same place whoever is holding it.
  const overTrash = (b, cardMark) => Boolean(b) && cardMark >= b.left;

  const readTarget = (x, y) => {
    const s = snap.current;
    if (!s) return;

    // Off the board first, and checked before the columns because the
    // nearest-column fallback below would otherwise claim everything.
    const box = info.current;
    const mark = box ? x - box.dx + box.w * (1 - ARM_AT) : x;
    if (overTrash(s.trash, mark)) { setTargetIfChanged({ trash: true }); return; }

    // Inside a column outright, else the nearest one horizontally — dragging
    // above or below the columns should still have an answer rather than
    // dropping the target and snapping the card home.
    let key = COLUMN_KEYS.find((k) => {
      const r = s[k]?.col;
      return r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    });
    if (!key) {
      let best = Infinity;
      for (const k of COLUMN_KEYS) {
        const r = s[k]?.col;
        if (!r) continue;
        const d = x < r.left ? r.left - x : x > r.right ? x - r.right : 0;
        if (d < best) { best = d; key = k; }
      }
    }
    if (!key) return;
    setTargetIfChanged({ trash: false, key, index: s[key].mids.filter((m) => m < y).length });
  };

  // Distance from the pointer to the bin, turned into how much the red reaches
  // out. Inside the panel it is 1 and everything is merged; a screen away it is
  // 0 and there is nothing but the resting pool.
  const paintGoo = (x, y) => {
    const g = gooRef.current;
    const r = snap.current?.trash;
    if (!g || !r) return;

    // The red takes hold of the card, not the cursor: the bead is the card's
    // own box in the card's own place, so what the band reaches out and grabs
    // is the thing being deleted rather than a dot the hand happens to be
    // dragging it by.
    const box = info.current;
    if (!box) return;
    const bx = x - box.dx;
    const by = y - box.dy;

    // The band's edge is a vertical line, so the gap is measured straight out
    // from the card's leading edge — its right one, now that the bin is over
    // there.
    const lead = bx + box.w;
    const d = Math.max(0, r.left - lead);
    const t = clamp(1 - d / GOO_REACH, 0, 1);

    // Eased so the reach is slow to start and quick to close, which is what
    // makes it read as something being pulled rather than something growing.
    const pull = t * t;
    g.style.opacity = String(0.09 + 0.17 * pull);

    // Positions are viewport coordinates; the layer's own origin sits a reach to
    // the left of the band and a bleed above the window.
    const originX = r.left - GOO_REACH;
    const originY = -BLEED;
    const put = (el, left, top, w, h, radius) => {
      if (!el) return;
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
      el.style.borderRadius = `${radius}px`;
      el.style.transform = `translate3d(${left - originX}px, ${top - originY}px, 0)`;
    };

    // The card, at its own size, but drawn as a capsule rather than a card:
    // a rounded rectangle merging with a rounded rectangle reads as two shapes
    // that have been glued, where two capsules read as one thing that flowed.
    put(gooBeadRef.current, bx, by, box.w, box.h, Math.min(box.w, box.h) / 2);

    // And the drop that bridges the gap, sized off the card so a wide card gets
    // a bridge to match. It is the only part that has to know about distance,
    // because a bridge to nothing is just a blob in the middle of the page.
    const bridge = Math.min(box.h, 120) * pull;
    put(
      gooDropRef.current,
      (lead + Math.max(lead, r.left)) / 2 - bridge / 2,
      by + box.h / 2 - bridge / 2,
      bridge, bridge, bridge / 2
    );
  };

  const beginDrag = (task, rect, startX, startY) => {
    const slot = rect.height + GAP;
    const s = {};

    for (const { key } of COLUMNS) {
      const colEl = colRefs.current[key];
      const listEl = listRefs.current[key];
      if (!colEl || !listEl) continue;

      const list = grouped[key] || [];
      const from = list.findIndex((t) => t.id === task.id);
      const mids = [];
      list.forEach((t, i) => {
        if (t.id === task.id) return;
        const r = cardRefs.current.get(t.id)?.getBoundingClientRect();
        if (!r) return;
        // Cards below the one being lifted close up behind it, so their
        // midpoints are recorded where they will BE, not where they were.
        mids.push((r.top + r.bottom) / 2 - (from !== -1 && i > from ? slot : 0));
      });

      s[key] = { col: colEl.getBoundingClientRect(), mids };
    }

    // Read once, like everything else here: where the last column stops is where
    // the bin starts, taken at the same instant as every other rect below.
    // The empty track can be a quarter of a wide board, which is more red than
    // a drop target needs to be. The band takes the outer part of it: pinned to
    // the window's edge, capped, and never crossing into the last column.
    const lastCol = colRefs.current[COLUMN_KEYS[COLUMN_KEYS.length - 1]];
    const edge = (lastCol?.getBoundingClientRect().right ?? window.innerWidth - TRASH_MIN_W) + TRASH_GAP;
    const left = Math.min(
      Math.max(edge, window.innerWidth - TRASH_MAX_W),
      window.innerWidth - TRASH_MIN_W
    );
    s.trash = { left, w: window.innerWidth - left, h: window.innerHeight };

    snap.current = s;
    info.current = { id: task.id, dx: startX - rect.left, dy: startY - rect.top, w: rect.width, h: rect.height };
    document.body.style.userSelect = 'none';
    setHeld({ task, w: rect.width, h: rect.height, x: rect.left, y: rect.top, trash: s.trash });
    readTarget(startX, startY);
    // One frame late on purpose: the blobs do not exist until the portal below
    // has rendered them.
    requestAnimationFrame(() => paintGoo(startX, startY));
    lastPoint.current = { x: startX, y: startY };
  };

  const onCardPointerDown = (e, task) => {
    suppressClick.current = false;
    if (!canManage || !dragEnabled) return;
    if (e.button !== 0) return;
    if (e.target.closest('[data-no-drag]')) return;

    const el = cardRefs.current.get(task.id);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    let started = false;

    // Listeners go on the document, not the card: the card unmounts the moment
    // the drag starts (it becomes the overlay), which would drop a pointer
    // capture held on it and strand the drag.
    const move = (ev) => {
      if (!started) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_THRESHOLD) return;
        started = true;
        suppressClick.current = true;
        beginDrag(task, rect, startX, startY);
      }
      // The overlay is moved by writing to the node, not through state. A
      // setState per pointermove would re-render every card on the board for
      // the length of the drag.
      const o = overlayRef.current;
      if (o && info.current) {
        o.style.transform = `translate3d(${ev.clientX - info.current.dx}px, ${ev.clientY - info.current.dy}px, 0)`;
      }
      readTarget(ev.clientX, ev.clientY);
      paintGoo(ev.clientX, ev.clientY);
      lastPoint.current = { x: ev.clientX, y: ev.clientY };
    };

    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
      if (!started) return;

      const t = targetRef.current;
      const from = (grouped[task.column_key] || []).findIndex((x) => x.id === task.id);

      // Dropped off the board. No confirm, by the same call as the swipe: the
      // card was carried the whole width of the page onto a target that has
      // been red since the drag began. The overlay is kept a moment longer and
      // sent into the bin, because a card that simply stops existing under the
      // pointer leaves nothing to connect the drop to the thing that happened.
      if (t?.trash) {
        const o = overlayRef.current;
        const r = snap.current?.trash;
        if (o && r) {
          const box = info.current;
          const y = lastPoint.current.y;
          // Where the card already is, so it fades in place rather than making
          // a trip of its own across the blob that is standing in for it.
          const bxCard = lastPoint.current.x - box.dx;

          // The card goes first and quickly, rounding off as it goes. What is
          // left behind is the blob that has been standing in for it under the
          // filter all along, so the card does not vanish — it stops being a
          // card and carries on as liquid.
          // The card hands over early — it is gone before the stretch is, so
          // what is being pulled into the bin is liquid and not a picture of a
          // card being dragged there.
          o.style.transition = `transform ${SWALLOW_MS * 0.45}ms var(--ease-out), opacity ${SWALLOW_MS * 0.26}ms linear`;
          o.style.transform =
            `translate3d(${bxCard}px, ${y - box.h / 2}px, 0) scale(0.88)`;
          o.style.opacity = '0';

          // A step up while it is being swallowed, not a flood: the shape is
          // what is worth watching here and a solid red panel only buries it.
          // The swap to the heavier filter is the part that matters — it gives
          // the stretch enough blur to hold together instead of snapping the
          // moment it is pulled.
          const g = gooRef.current;
          if (g) {
            g.style.filter = 'url(#taskGooThick)';
            g.style.transition = `opacity ${SWALLOW_MS * 0.3}ms var(--ease-out)`;
            g.style.opacity = '0.3';
          }

          // Then the blob does the whole thing in two moves, because one move
          // is a shape travelling and two is a liquid being drawn in.
          //
          // It stretches first: the card's blob reaches into the band and
          // squeezes thin doing it, the way something viscous goes narrow when
          // it is pulled. Then it lets go of where it was and collapses into
          // the pool. The bridge fattens on the way out and only breaks at the
          // end, so the thread is the last thing left.
          const bead = gooBeadRef.current;
          const drop = gooDropRef.current;
          const originX = r.left - GOO_REACH;
          const bx = lastPoint.current.x - box.dx;
          const by = lastPoint.current.y - box.dy;
          const stretchMs = Math.round(SWALLOW_MS * 0.45);
          const ease = (ms, curve) =>
            `width ${ms}ms ${curve}, height ${ms}ms ${curve}, ` +
            `border-radius ${ms}ms linear, transform ${ms}ms ${curve}`;

          const thin = Math.max(box.h * 0.52, 34);
          if (bead) {
            bead.style.transition = ease(stretchMs, 'cubic-bezier(0.35, 0, 0.25, 1)');
            bead.style.width = `${Math.max(r.left + r.w * 0.4 - bx, box.w)}px`;
            bead.style.height = `${thin}px`;
            bead.style.borderRadius = `${thin / 2}px`;
            bead.style.transform =
              `translate3d(${bx - originX}px, ${by + box.h / 2 - thin / 2 + BLEED}px, 0)`;
          }
          if (drop) {
            const fat = Math.max(thin * 0.8, 30);
            drop.style.transition = ease(stretchMs, 'cubic-bezier(0.35, 0, 0.25, 1)');
            drop.style.width = `${fat}px`;
            drop.style.height = `${fat}px`;
            drop.style.borderRadius = `${fat / 2}px`;
          }

          setTimeout(() => {
            const collapse = SWALLOW_MS - stretchMs;
            if (bead) {
              bead.style.transition = ease(collapse, 'cubic-bezier(0.6, 0, 0.2, 1)');
              bead.style.width = '46px';
              bead.style.height = '46px';
              bead.style.borderRadius = '23px';
              bead.style.transform =
                `translate3d(${r.left + r.w / 2 - 23 - originX}px, ${y - 23 + BLEED}px, 0)`;
            }
            if (drop) {
              drop.style.transition = ease(collapse, 'cubic-bezier(0.6, 0, 0.2, 1)');
              drop.style.width = '0px';
              drop.style.height = '0px';
            }
          }, stretchMs);
        }
        setTimeout(() => { clearDrag(); onDelete(task); }, o && r ? SWALLOW_MS : 0);
        return;
      }

      clearDrag();
      if (!t) return;
      // Indices are in dragged-card-removed space, so landing back on `from` in
      // the same column is the no-op.
      if (t.key === task.column_key && t.index === from) return;
      setLanding(task.id);
      clearTimeout(landTimer.current);
      landTimer.current = setTimeout(() => setLanding(null), SETTLE_MS + 60);
      onReorder(moveTask(tasks, task.id, t.key, t.index));
    };

    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
  };

  const openTask = (task) => {
    // The click that follows the pointerup that ended a drag.
    if (suppressClick.current) { suppressClick.current = false; return; }
    onEdit(task);
  };

  // The menu's Move to, and the swipe's next stage. Both land the card in its
  // new column with the same settle a dropped card gets, so a card that arrives
  // without having been dragged still arrives rather than appearing.
  const handleMoveTo = useCallback((task, key) => {
    setLanding(task.id);
    clearTimeout(landTimer.current);
    landTimer.current = setTimeout(() => setLanding(null), SETTLE_MS + 60);
    onReorder(moveTask(tasks, task.id, key, (grouped[key] || []).length));
  }, [tasks, grouped, onReorder]);

  // Four tracks for three columns. The empty one is not a gap the layout forgot
  // to close — it is where a card goes to be deleted, and closing it would put
  // the bin back on top of a column the way the left margin used to.
  return (
    <div ref={boardRef} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5 items-start">
      {COLUMNS.map((col) => {
        // The held card leaves the list entirely — it is being drawn over the
        // page — and a placeholder stands in the slot it would drop into.
        const all = grouped[col.key] || [];
        const items = all.filter((t) => t.id !== held?.task.id);
        const isTarget = held && target?.key === col.key;
        const at = isTarget ? Math.min(target.index, items.length) : -1;

        // One placeholder for the whole board, shared across slots and columns
        // by layoutId, so moving between two slots slides the gap rather than
        // closing one and blinking another open somewhere else.
        const placeholder = (
          <motion.div
            layoutId="task-drop-placeholder"
            layout={reduce ? false : true}
            transition={{ duration: 0.2, ease: EASE }}
            className="rounded-2xl border-2 border-dashed border-ninja-blue/40 bg-ninja-blue/[0.05]"
            style={{ height: held?.h }}
          />
        );

        return (
          <section
            key={col.key}
            ref={(el) => { colRefs.current[col.key] = el; }}
            aria-labelledby={`col-${col.key}`}
            className={`rounded-2xl p-4 transition-colors duration-150 ${
              isTarget ? 'bg-ninja-blue/[0.07]' : 'bg-ninja-bg'
            }`}
          >
            {/* Title, then the count in a lighter weight, then the add glyph —
                the reference's column header. */}
            <div className="flex items-center justify-between gap-2 px-0.5 pb-3">
              <h3 id={`col-${col.key}`} className="font-ninja text-[15px] font-bold text-ninja-navy">
                {col.label}
                <span className="ml-2 text-sm font-normal text-ninja-muted tabular-nums">
                  {all.length}
                </span>
              </h3>
              {canManage && (
                <button
                  type="button"
                  onClick={() => onAdd(col.key)}
                  aria-label={`Add task to ${col.label}`}
                  title={`Add task to ${col.label}`}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-ninja-muted hover:text-ninja-blue hover:bg-white dark:hover:bg-white/5 transition-colors flex-shrink-0"
                >
                  <PlusIcon size={17} strokeWidth={2.25} />
                </button>
              )}
            </div>

            <div
              ref={(el) => { listRefs.current[col.key] = el; }}
              className="relative space-y-3 min-h-[2rem]"
            >
              {items.map((task, i) => (
                <Fragment key={task.id}>
                  {at === i && placeholder}
                  <TaskCard
                    task={task}
                    canManage={canManage}
                    grabbable={canManage && dragEnabled && !task.archived_at}
                    // The other horizontal gesture. Never both at once — see
                    // the note above DISMISS_AT.
                    swipeable={canManage && !dragEnabled && !task.archived_at}
                    settling={landing !== null}
                    landed={landing === task.id}
                    leaving={leavingId === task.id}
                    cardRef={(el) => {
                      if (el) cardRefs.current.set(task.id, el);
                      else cardRefs.current.delete(task.id);
                    }}
                    onPointerDown={(e) => onCardPointerDown(e, task)}
                    // The click that follows the pointerup that ended a swipe
                    // would otherwise open the card as it flies away.
                    onSwipeStart={() => { suppressClick.current = true; }}
                    onOpen={() => openTask(task)}
                    onDelete={onDelete}
                    onRestore={onRestore}
                    onMoveTo={handleMoveTo}
                  />
                </Fragment>
              ))}
              {at >= items.length && placeholder}

              {/* No empty-state sentence under an empty column: the Add task
                  row below already says the column is empty and offers the one
                  thing to do about it. A read-only board keeps the sentence,
                  because there it has nothing else to say. */}
              {items.length === 0 && !canManage && (
                <p className="font-ninja text-xs text-ninja-muted px-1 py-3">
                  {col.key === 'done' ? 'Nothing finished yet.' : 'Nothing here.'}
                </p>
              )}
            </div>

            {/* Clearing lives at the foot of the column it clears, in the slot
                the other columns give to quick add — because those two are the
                same thing in their own way: the one action a column wants
                often enough to have it waiting there. Nothing is typed into
                Done, and nothing is cleared out of the others. */}
            {canManage && col.key === 'done' && all.length > 0 && (
              <button
                type="button"
                onClick={onClearDone}
                className="mt-3 w-full px-3 py-2.5 rounded-xl bg-transparent border border-transparent hover:border-ninja-border hover:text-ninja-navy font-ninja text-sm text-ninja-muted text-left transition-colors duration-150"
              >
                Clear All
              </button>
            )}

            {canManage && col.key !== 'done' && (
              // Most cards on this board are one sentence somebody thought of
              // while standing up. Typing it here is the whole interaction; the
              // + in the header is for the ones that need a date and an owner.
              <form
                className="mt-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const text = quickAdd.text.trim();
                  if (!text) return;
                  setQuickAdd({ key: col.key, text: '' });
                  onQuickAdd(col.key, text);
                }}
              >
                <input
                  type="text"
                  value={quickAdd.key === col.key ? quickAdd.text : ''}
                  onChange={(e) => setQuickAdd({ key: col.key, text: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Escape') { setQuickAdd({ key: null, text: '' }); e.currentTarget.blur(); } }}
                  placeholder="+ Quick add"
                  aria-label={`Quick add a task to ${col.label}`}
                  className="w-full px-3 py-2.5 rounded-xl bg-transparent border border-transparent hover:border-ninja-border focus:border-ninja-blue focus:bg-white dark:focus:bg-white/5 font-ninja text-sm text-ninja-navy placeholder:text-ninja-muted transition-colors duration-150"
                />
              </form>
            )}
          </section>
        );
      })}

      {/* The red itself, three blobs under one goo filter. A pool over the nav,
          a bead riding the card, and a droplet between them: blurred together
          and then thresholded back to a hard edge, two shapes near each other
          stop being two shapes, and the pool reaches out and takes the card
          rather than waiting for it to arrive. The droplet is what carries the
          bridge across a gap wider than the blur alone could span.

          Solid red inside the filter, with the tint applied to the whole layer
          afterwards — the threshold works on alpha, so a translucent blob would
          come out of it either fully there or not at all. */}
      {held?.trash && createPortal(
        <>
          <svg width="0" height="0" aria-hidden="true" className="absolute pointer-events-none">
            <defs>
              {/* A softer blur and a gentler slope on the alpha than a goo
                  filter usually runs. Steep is what gives the effect its
                  cartoon snap — everything either fully there or not — and the
                  cost is a hard edge on every shape. Easing the slope lets the
                  blur keep some of its own falloff, so the blobs round off and
                  meet each other rather than clicking together. */}
              <filter id="taskGoo" x="-40%" y="-40%" width="180%" height="180%" colorInterpolationFilters="sRGB">
                <feGaussianBlur in="SourceGraphic" stdDeviation="22" result="soft" />
                <feColorMatrix
                  in="soft"
                  type="matrix"
                  values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 14 -6"
                />
              </filter>
              {/* The same thing with more blur to work with, swapped in for the
                  swallow. More blur is more distance over which two shapes can
                  find each other, which is what makes the stretch hold together
                  instead of snapping the moment it is pulled. */}
              <filter id="taskGooThick" x="-60%" y="-60%" width="220%" height="220%" colorInterpolationFilters="sRGB">
                <feGaussianBlur in="SourceGraphic" stdDeviation="34" result="soft" />
                <feColorMatrix
                  in="soft"
                  type="matrix"
                  values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 13 -5.5"
                />
              </filter>
            </defs>
          </svg>
          <div
            ref={gooRef}
            aria-hidden="true"
            className="fixed z-[58] pointer-events-none"
            style={{
              left: held.trash.left - GOO_REACH,
              top: -BLEED,
              width: held.trash.w + GOO_REACH + BLEED,
              height: held.trash.h + BLEED * 2,
              filter: 'url(#taskGoo)',
              // The fade cannot live inside the filter: the threshold that
              // welds the blobs together works on alpha, so a gradient handed
              // to it comes back as a hard edge in a slightly different place.
              // It goes on the whole layer afterwards instead, which fades the
              // reaching bead along with the band and is why the red thins out
              // towards the board rather than stopping at a line.
              maskImage: maskFor(held.trash.w),
              WebkitMaskImage: maskFor(held.trash.w),
              opacity: 0.07,
            }}
          >
            {/* Hangs off the top, the right and the bottom, so the corners the
                filter rounds are all outside the window. */}
            <div
              className="absolute top-0 right-0 h-full bg-ninja-red"
              style={{ width: held.trash.w + BLEED, borderRadius: '999px 0 0 999px' }}
            />
            <div ref={gooBeadRef} className="absolute top-0 left-0 bg-ninja-red" />
            <div ref={gooDropRef} className="absolute top-0 left-0 bg-ninja-red" />
          </div>
        </>,
        document.body
      )}

      {/* Where a card goes to be got rid of: a circle out on its own in the
          left margin, the same size and in the same place whatever the sidebar
          is doing. It appears the moment a drag starts rather than waiting to
          be discovered, because a drop target nobody knows about is not one. */}
      {held?.trash && createPortal(
        <motion.div
          aria-hidden="true"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.22, ease: EASE }}
          // No fill here any more — the goo layer underneath is the red. This
          // is the dashed edge and the words, which is the part that has to
          // stay legible whatever the liquid is doing.
          className="fixed top-0 z-[59] pointer-events-none flex items-center justify-center"
          style={{ left: held.trash.left, width: held.trash.w, height: held.trash.h }}
        >
          <span className={`flex flex-col items-center gap-2 px-3 font-ninja text-xs font-bold text-center transition-all duration-200 ease-[var(--ease-out)] ${
            target?.trash ? 'text-ninja-red scale-105' : 'text-ninja-red/45'
          }`}>
            <Trash2Icon size={20} strokeWidth={2.25} />
            {target?.trash ? 'Let go to delete' : 'Drag here to delete'}
          </span>
        </motion.div>,
        document.body
      )}

      {/* The held card, drawn over the page. It has to escape the column: a
          column is a scroll-and-overflow context, and a card dragged out of one
          would be clipped at its edge. */}
      {held && createPortal(
        <div
          ref={overlayRef}
          aria-hidden="true"
          className="fixed top-0 left-0 z-[60] pointer-events-none"
          style={{ width: held.w, transform: `translate3d(${held.x}px, ${held.y}px, 0)` }}
        >
          {/* The card under the pointer keeps its colour while it travels —
              until it is over the bin, where it goes red and shrinks, so the
              card itself says what will happen to it and not just the thing
              underneath it. */}
          {/* Over the bin the card starts going soft before it is let go of:
              it rounds towards the capsule the blob underneath it already is,
              tips further over and gives up its edges. By the time it is
              dropped it is most of the way to being liquid, so the swallow has
              something to finish rather than something to start. */}
          <div
            className={`${CARD} ${TASK_SURFACE} task-lensed p-3.5 shadow-xl relative transition-all duration-200 ease-[var(--ease-out)] ${
              target?.trash ? 'ring-2 ring-ninja-red -rotate-3 scale-95' : '-rotate-1'
            }`}
            style={target?.trash ? { borderRadius: `${Math.min(held.w, held.h) / 2}px` } : undefined}
          >
            {target?.trash && (
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-ninja-red/15 pointer-events-none"
                style={{ borderRadius: `${Math.min(held.w, held.h) / 2}px` }}
              />
            )}
            <TaskCardFace task={held.task} />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
