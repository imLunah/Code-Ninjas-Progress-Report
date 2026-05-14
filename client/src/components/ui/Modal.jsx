import { useEffect } from 'react';

const isSafari = typeof navigator !== 'undefined' &&
  /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

export default function Modal({ isOpen, onClose, title, children, subheader, width = 'max-w-lg' }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] bg-ninja-navy/50 ${isSafari ? '' : 'flex items-center justify-center p-4'}`}
      onClick={onClose}
    >
      <div
        className={`${isSafari ? 'fixed bottom-0 left-0 right-0 rounded-t-2xl' : 'relative rounded-xl'} bg-white border border-ninja-border shadow-xl w-full ${width} max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — never scrolls */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-ninja-border">
          <h2 className="text-xl font-bold font-ninja text-ninja-navy">{title}</h2>
          <button
            onClick={onClose}
            className="text-ninja-muted hover:text-ninja-navy transition-colors text-2xl leading-none"
          >
            &times;
          </button>
        </div>
        {/* Optional non-scrolling subheader (e.g. search bar) */}
        {subheader && (
          <div className="flex-shrink-0 px-4 pt-3 pb-2">
            {subheader}
          </div>
        )}
        {/* Content — scrolls */}
        <div className="flex-1 overflow-y-auto p-4 pt-2">
          {children}
        </div>
      </div>
    </div>
  );
}
