import { useState, useRef, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';

export default function EmojiButton({ onSelect, position = 'top' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const popupClass = position === 'top'
    ? 'absolute bottom-8 right-0 z-50'
    : 'absolute top-8 right-0 z-50';

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Add emoji"
        className="text-lg leading-none text-ninja-muted hover:text-ninja-navy transition-colors select-none"
      >
        😊
      </button>
      {open && (
        <div className={popupClass}>
          <EmojiPicker
            onEmojiClick={(data) => { onSelect(data.emoji); setOpen(false); }}
            width={300}
            height={380}
            searchDisabled={false}
            skinTonesDisabled
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}
    </div>
  );
}
