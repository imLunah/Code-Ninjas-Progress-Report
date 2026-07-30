import { lazy, Suspense } from 'react';
import { useTheme } from '../../context/ThemeContext';

// The picker is ~200kB of emoji metadata. It is only ever opened deliberately,
// so it must not be in the graph of a page that merely shows a board.
const EmojiPicker = lazy(() => import('emoji-picker-react'));

// emojiStyle="native" is NOT cosmetic. Every other style fetches sprite sheets
// from a CDN, and our CSP img-src lists only self, data:, blob: and Supabase,
// so the picker would render a grid of blank squares. Native draws the glyphs
// the operating system already has: nothing to fetch, nothing to add to the
// policy, and it matches what the reaction chips render anyway.
export default function LazyEmojiPicker({ onPick, onClose }) {
  const { dark } = useTheme();
  return (
    <Suspense fallback={<div className="w-[320px] h-[380px] rounded-xl bg-ninja-bg" aria-hidden="true" />}>
      <EmojiPicker
        onEmojiClick={(data) => { onPick(data.emoji); onClose?.(); }}
        theme={dark ? 'dark' : 'light'}
        emojiStyle="native"
        lazyLoadEmojis
        skinTonesDisabled
        width={320}
        height={380}
        previewConfig={{ showPreview: false }}
      />
    </Suspense>
  );
}
