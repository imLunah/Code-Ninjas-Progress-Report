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
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-ninja-bg md:bg-ninja-navy/50 md:items-center md:justify-center md:p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <div
        className={`w-full flex-1 flex flex-col overflow-hidden md:flex-none md:max-h-[90dvh] md:rounded-2xl md:bg-ninja-bg md:shadow-xl md:border md:border-ninja-border ${width}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Desktop header with × */}
        <div className="hidden md:flex flex-shrink-0 items-center justify-between p-4 border-b border-ninja-border">
          <h2 className="text-xl font-bold font-ninja text-ninja-navy">{title}</h2>
          <button
            onClick={onClose}
            className="text-ninja-muted hover:text-ninja-navy transition-colors text-2xl leading-none"
          >
            &times;
          </button>
        </div>
        {/* Mobile title row (no × — Done button at bottom is the close) */}
        <div className="flex-shrink-0 px-4 pt-4 pb-2 md:hidden">
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
        <div className="flex-shrink-0 px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-2 border-t border-ninja-border md:hidden">
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
