import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

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
export default function Toast({ message, show, duration = 2200, onDone }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!show) return undefined;

    setVisible(true);
    setLeaving(false);

    const hide = setTimeout(() => setLeaving(true), duration);
    // Long enough for the exit to finish; the state is what actually unmounts.
    const done = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, duration + 260);

    return () => {
      clearTimeout(hide);
      clearTimeout(done);
    };
    // onDone deliberately absent: a parent passing a fresh closure each render
    // would restart the timer on every keystroke elsewhere on the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, duration, message]);

  if (!visible || !message) return null;

  return createPortal(
    <div
      className="fixed inset-x-0 bottom-24 lg:bottom-8 z-[100] flex justify-center px-4 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div
        className={`${leaving ? 'toast-out' : 'toast-in'} max-w-sm rounded-xl bg-ninja-navy text-white font-ninja text-sm font-semibold px-4 py-3 shadow-lg`}
      >
        {message}
      </div>
    </div>,
    document.body
  );
}
