import { DUE_TONE, dueMeta, plainPreview } from '../../lib/taskBoard';

// What a task card looks like, in one place.
//
// The board, the dashboard chip and its hover panel all draw this. Surfaces
// that claim to be the same board must not be separate pieces of code that can
// drift apart — a preview is only a preview if a card on it is recognisably the
// card you are about to go and find.
//
// `onOpen` is what makes a card editable. The board passes it; the previews do
// not, which is what makes them read-only by construction rather than by
// remembering to leave the controls off.
//
// Layout follows the reference: the card's own words and its menu, a
// description under them, then a footer holding the date on the left and the
// tag on the right.
export default function TaskCardFace({ task, onOpen, actions }) {
  const due = dueMeta(task.due_date);
  const body = plainPreview(task.body);

  // A card is allowed to be a note. Everything carried over from the sticky
  // wall is a paragraph somebody typed with no title on it, and inventing one
  // from the first few words would put a heading on the card that its author
  // never wrote. So a titleless card simply leads with what it says, in the
  // weight prose deserves rather than the weight a name deserves.
  const titled = Boolean(task.title && task.title.trim());
  const lead = titled ? task.title : body;
  const supporting = titled ? body : '';

  const leadClass = titled
    ? 'font-ninja text-sm font-bold text-ninja-navy leading-snug text-pretty'
    : 'font-ninja text-sm text-ninja-navy leading-relaxed text-pretty line-clamp-4';

  return (
    <>
      <div className="flex items-start gap-2">
        <div className={`flex-1 min-w-0 ${leadClass}`}>
          {onOpen ? (
            // Typography comes from the wrapper; this only adds the press.
            <button type="button" onClick={onOpen} className="w-full text-left rounded">
              {lead}
            </button>
          ) : (
            lead
          )}
        </div>
        {actions}
      </div>

      {supporting && (
        <p className="mt-1.5 font-ninja text-xs text-ninja-muted leading-relaxed line-clamp-2">
          {supporting}
        </p>
      )}

      {/* The footer is the date's alone. The coloured bar that used to sit
          beside it is gone: the card is one pane of glass now, and a task's
          colour is not drawn anywhere. */}
      {due && (
        <div className="mt-3">
          <span className={`font-ninja text-xs truncate ${DUE_TONE[due.tone]}`}>{due.text}</span>
        </div>
      )}
    </>
  );
}
