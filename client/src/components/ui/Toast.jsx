import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckIcon, TriangleAlertIcon } from 'lucide-react';
import { PANEL } from '../../lib/surfaces';

// A short confirmation that gets out of the way.
//
// For the case where something worked and the person is already looking at what
// they did: logging a ninja, saving a note. It says so from the bottom of the
// screen and leaves on its own, rather than replacing the thing that just
// succeeded with a banner about it.
//
// Portalled to the body so a dialog, a scroll container or an overflow-hidden
// card cannot clip it, and pointer-events are off so it never swallows a press
// meant for whatever is underneath.
//
// The motion is in index.css: it arrives a little past its resting place and
// settles back, which is what makes it read as placed rather than drawn.
// Success leaves quickly because the person already knows what they did and
// the toast is only confirming it. A problem has to be read before it can be
// acted on, so it stays roughly twice as long and announces itself assertively
// rather than politely.
const VARIANTS = {
  success: {
    Icon: CheckIcon,
    tone: 'text-emerald-600 dark:text-emerald-400',
    duration: 2200,
    role: 'status',
    live: 'polite',
  },
  error: {
    Icon: TriangleAlertIcon,
    tone: 'text-ninja-red',
    duration: 4500,
    role: 'alert',
    live: 'assertive',
  },
};

export default function Toast({ message, show, variant = 'success', duration, onDone }) {
  const style = VARIANTS[variant] || VARIANTS.success;
  const life = duration ?? style.duration;
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!show) return undefined;

    setVisible(true);
    setLeaving(false);

    const hide = setTimeout(() => setLeaving(true), life);
    // Long enough for the exit to finish; the state is what actually unmounts.
    const done = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, life + 260);

    return () => {
      clearTimeout(hide);
      clearTimeout(done);
    };
    // onDone deliberately absent: a parent passing a fresh closure each render
    // would restart the timer on every keystroke elsewhere on the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, life, message, variant]);

  if (!visible || !message) return null;

  return createPortal(
    <div
      className="fixed inset-x-0 bottom-24 lg:bottom-8 z-[100] flex justify-center px-4 pointer-events-none"
      role={style.role}
      aria-live={style.live}
    >
      <div
        // The app's own solid panel, with the app's own text colour.
        //
        // This was bg-ninja-navy with white text, which is a text token used as
        // a background: navy is near-black in light mode and near-WHITE in dark,
        // so the dark theme got white on near-white. The accent was no better —
        // ninja-blue is lightened in dark mode precisely so it can be read
        // against a dark page, which makes white sitting on it about 2.6:1.
        //
        // PANEL and text-ninja-navy flip together, so the contrast holds in both
        // themes without a special case for either.
        className={`${leaving ? 'toast-out' : 'toast-in'} ${PANEL} flex items-center gap-2.5 max-w-sm px-4 py-3 font-ninja text-sm font-semibold text-ninja-navy shadow-lg dark:shadow-[0_10px_34px_rgb(0_0_0/0.45)]`}
      >
        {/* The one spot of colour, and it carries the meaning. A whole panel
            tinted green shouts; a check does the same job at a glance. */}
        <style.Icon size={16} className={`${style.tone} flex-shrink-0`} aria-hidden />
        <span>{message}</span>
      </div>
    </div>,
    document.body
  );
}
