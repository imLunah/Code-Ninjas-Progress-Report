import { COLOR_HEX, DUE_TONE, dueMeta, plainPreview } from '../../lib/taskBoard';

// What a task card looks like, in one place.
//
// The board and the dashboard preview both draw this. Two surfaces that claim
// to be the same board must not be two pieces of code that can drift apart —
// the preview is only a preview if a card on it is recognisably the card you
// are about to go and find.
//
// Interactivity is passed in rather than built in, which is what keeps the
// preview read-only by construction: the board hands over a title that opens
// the editor and its action menu, the preview hands over neither, so there is
// nothing on a preview card to press by accident.
export default function TaskCardFace({ task, title, actions }) {
  const due = dueMeta(task.due_date);
  const preview = plainPreview(task.body);
  const dot = COLOR_HEX[task.color];

  return (
    <>
      <div className="flex items-start gap-2">
        {dot && (
          // Inline hex — a bg-* utility here would be rewritten by the dark
          // overrides and stop matching the swatch that chose it.
          <span
            aria-hidden="true"
            className="w-2 h-2 rounded-full flex-shrink-0 mt-[7px]"
            style={{ backgroundColor: dot }}
          />
        )}
        {/* The typography lives on the wrapper so whatever the caller passes —
            plain text or a button — inherits it and the two can't diverge. */}
        <div className="flex-1 min-w-0 font-ninja text-sm font-bold text-ninja-navy leading-snug text-pretty">
          {title ?? task.title}
        </div>
        {actions}
      </div>

      {preview && (
        <p className="mt-1.5 font-ninja text-xs text-ninja-muted leading-relaxed line-clamp-2">
          {preview}
        </p>
      )}

      {due && <p className={`mt-2 font-ninja text-xs ${DUE_TONE[due.tone]}`}>{due.text}</p>}
    </>
  );
}
