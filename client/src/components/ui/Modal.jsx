import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ isOpen, onClose, title, children, subheader, width = 'max-w-lg' }) {
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    // Mobile: the outer div IS the full-screen panel — header always at top, guaranteed.
    // Desktop (lg+): dark backdrop + centered rounded panel.
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-white pt-[env(safe-area-inset-top)] lg:pt-0 lg:bg-ninja-navy/50 lg:items-center lg:justify-center lg:p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`w-full flex-1 flex flex-col overflow-hidden lg:flex-none lg:max-h-[90dvh] lg:rounded-2xl lg:bg-white lg:shadow-xl lg:border lg:border-ninja-border ${width}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-ninja-border">
          <h2 className="text-xl font-bold font-ninja text-ninja-navy">{title}</h2>
          <button
            onClick={onClose}
            className="text-ninja-muted hover:text-ninja-navy transition-colors text-2xl leading-none"
          >
            &times;
          </button>
        </div>
        {subheader && (
          <div className="flex-shrink-0 px-4 pt-3 pb-2">
            {subheader}
          </div>
        )}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 pt-2">
          {children}
        </div>
        <div className="flex-shrink-0 px-4 pb-4 pt-2 border-t border-ninja-border lg:hidden">
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
