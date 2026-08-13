import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { XIcon } from 'lucide-react';

const EASE = [0.23, 1, 0.32, 1];

// A panel that comes in from the right and leaves the page it came from
// visible. Modal's sibling, not its replacement: a dialog is for a question
// that has to be answered before anything else can happen, and opening a task
// is not that. You should be able to read the card you opened against the
// column it came out of.
//
// Which is why there is no backdrop and no focus trap. Both belong to a modal
// dialog, and wearing them here would make a panel that only looks
// non-blocking — `aria-modal="false"` says the rest of the page is still live,
// and it has to be true. Escape closes it and focus moves in on open and back
// to the card on close, because those are courtesies, not walls.
export default function SidePanel({ isOpen, onClose, title, children, width = 'w-[26rem]' }) {
  const panelRef = useRef(null);
  const returnFocusTo = useRef(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    // A press anywhere else closes it. With no backdrop to click there is
    // nothing to catch that press, so the document is asked instead: if it did
    // not land inside the panel, whatever it landed on is what is wanted now.
    //
    // On pointerdown rather than click, so a press that starts outside and ends
    // inside — dragging a card across the panel, a text selection that runs off
    // the edge — still counts as leaving. And it runs after this render, so the
    // press that opened the panel is long finished and cannot close it again.
    const onPointerDown = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    returnFocusTo.current = document.activeElement;
    // The panel itself, not its first field. A dialog that has to be dealt with
    // can put the cursor in a box; a panel that opened beside what you were
    // reading should not start typing at you.
    panelRef.current?.focus();
    return () => {
      const el = returnFocusTo.current;
      if (el && typeof el.focus === 'function' && document.contains(el)) el.focus();
    };
  }, [isOpen]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-label={typeof title === 'string' ? title : undefined}
          tabIndex={-1}
          initial={reduce ? { opacity: 0 } : { x: '100%' }}
          animate={reduce ? { opacity: 1 } : { x: 0 }}
          exit={reduce ? { opacity: 0 } : { x: '100%' }}
          transition={{ duration: 0.28, ease: EASE }}
          className={`fixed top-0 right-0 z-[100] h-[100dvh] ${width} max-w-[92vw] flex flex-col bg-ninja-bg glass-chrome glass-edge border-l border-ninja-border shadow-[-18px_0_40px_-24px_rgb(0_0_0/0.35)] dark:shadow-[-18px_0_48px_-20px_rgb(0_0_0/0.6)] focus:outline-none`}
        >
          <div className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-3.5 border-b border-ninja-border">
            <h2 className="font-ninja text-lg font-bold text-ninja-navy truncate">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-full flex items-center justify-center text-ninja-muted hover:text-ninja-navy hover:bg-white dark:hover:bg-white/5 transition-colors flex-shrink-0"
            >
              <XIcon size={17} strokeWidth={2.25} />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            {children}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>,
    document.body
  );
}
