import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// Elements a keyboard can land on. Used to keep Tab inside the dialog.
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), ' +
  'select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({ isOpen, onClose, title, children, subheader, width = 'max-w-lg' }) {
  const panelRef = useRef(null);
  const returnFocusTo = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Escape to close, and Tab cycles within the dialog rather than walking the
  // page behind it. Listener is on the document so it works no matter where
  // focus currently sits.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
      if (e.key !== 'Tab') return;
      const items = panelRef.current?.querySelectorAll(FOCUSABLE);
      if (!items || items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      // Focus escaped the panel (or never entered it) — pull it back in.
      if (!panelRef.current.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
        return;
      }
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // Move focus in on open and hand it back to whatever opened the dialog on
  // close, so keyboard users don't get dropped at the top of the page.
  useEffect(() => {
    if (!isOpen) return;
    returnFocusTo.current = document.activeElement;
    const first = panelRef.current?.querySelector(FOCUSABLE);
    (first ?? panelRef.current)?.focus();
    return () => {
      const el = returnFocusTo.current;
      if (el && typeof el.focus === 'function' && document.contains(el)) el.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="modal-backdrop fixed inset-0 z-[100] flex flex-col bg-ninja-bg sm:bg-black/50 sm:items-center sm:justify-center sm:p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        className={`modal-panel w-full flex-1 flex flex-col overflow-hidden focus:outline-none sm:flex-none sm:max-h-[90dvh] sm:rounded-2xl sm:bg-ninja-bg sm:shadow-xl sm:border sm:border-ninja-border ${width}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Desktop header with × */}
        <div className="hidden sm:flex flex-shrink-0 items-center justify-between p-4 border-b border-ninja-border">
          <h2 className="text-xl font-bold font-ninja text-ninja-navy">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-ninja-muted hover:text-ninja-navy transition-colors text-2xl leading-none"
          >
            &times;
          </button>
        </div>
        {/* Mobile title row (no × — Done button at bottom is the close).
            The heading renders twice across breakpoints, so the accessible
            name comes from aria-label rather than pointing at one of them:
            aria-labelledby would go empty on whichever is display:none. */}
        <div className="flex-shrink-0 px-4 pt-4 pb-2 sm:hidden">
          <h2 className="text-xl font-bold font-ninja text-ninja-navy">{title}</h2>
        </div>
        {subheader && (
          <div className="flex-shrink-0 px-4 pt-1 pb-2">
            {subheader}
          </div>
        )}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 pt-2">
          {children}
        </div>
        <div className="flex-shrink-0 px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-2 border-t border-ninja-border sm:hidden">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-ninja-bg text-ninja-navy font-ninja font-semibold text-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
