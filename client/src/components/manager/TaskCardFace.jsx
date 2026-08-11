import { COLOR_HEX, DUE_TONE, dueMeta, plainPreview } from '../../lib/taskBoard';

// What a task card looks like, in one place.
//
// The board, the dashboard preview and the hover panel all draw this. Surfaces
// that claim to be the same board must not be separate pieces of code that can
// drift apart — the preview is only a preview if a card on it is recognisably
// the card you are about to go and find.
//
// Interactivity is passed in rather than built in, which is what keeps the
// previews read-only by construction: the board hands over a title that opens
// the editor and its action menu, the previews hand over neither, so there is
// nothing on a preview card to press by accident.
//
// Layout follows the reference: title and its menu, description under it, then
// a footer holding the date on the left and the tag on the right.
export default function TaskCardFace({ task, title, actions }) {
  const due = dueMeta(task.due_date);
  const preview = plainPreview(task.body);
  const tag = COLOR_HEX[task.color];

  return (
    <>
      <div className="flex items-start gap-2">
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

      {(due || tag) && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className={`font-ninja text-xs truncate ${due ? DUE_TONE[due.tone] : ''}`}>
            {due?.text}
          </span>
          {tag && (
            // The tag bar. This is NOT the left-edge active stripe the project
            // banned — that one was a position marker glued to the leading edge
            // of a nav item. This sits in the card's footer, on the trailing
            // side, and carries the one thing the card can't say in words.
            //
            // Inline hex: a bg-* utility would be rewritten by the dark
            // overrides and stop matching the swatch that chose it.
            <span
              aria-hidden="true"
              className="h-1.5 w-9 rounded-full flex-shrink-0"
              style={{ backgroundColor: tag }}
            />
          )}
        </div>
      )}
    </>
  );
}
