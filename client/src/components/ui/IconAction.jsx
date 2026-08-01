// A row action as a glyph. Replaces the outlined coloured word-pills that used
// to sit at the end of archive rows, where a green "Restore" box beside a red
// "Delete" box put two loud shapes next to a person's name and made the name
// the quietest thing in the row.
//
// The button rests muted and only takes colour under the pointer, so the row
// reads as a list until you reach for it. Tone tints on hover with an alpha of
// the colour rather than a `bg-green-50` style utility: the `.dark` overrides in
// index.css match those exact class names, while an opacity variant escapes them
// and composites correctly over either theme.
//
// Reversible actions belong here. A destructive CONFIRM does not: it keeps its
// word, so nothing irreversible rests on recognising a glyph.
const TONES = {
  default: 'hover:text-ninja-navy hover:bg-ninja-navy/10',
  positive: 'hover:text-green-600 dark:hover:text-green-400 hover:bg-green-500/15',
  danger: 'hover:text-ninja-red hover:bg-red-500/15',
};

export default function IconAction({ onClick, label, tone = 'default', disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-ninja-muted transition-colors disabled:opacity-40 disabled:hover:bg-transparent ${TONES[tone] || TONES.default}`}
    >
      {children}
    </button>
  );
}
