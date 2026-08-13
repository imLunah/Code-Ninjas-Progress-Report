import { useState, useCallback } from 'react';
import { Loader2Icon, TriangleAlertIcon } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import BouncingDots from '../ui/BouncingDots';
import { api } from '../../api/client';

// Pulling this center's ninjas out of MyStudio instead of a spreadsheet.
//
// Deliberately not a replacement for the CSV import, which stays exactly where
// it was. This is experimental, it depends on an undocumented vendor API, and a
// roster is not something to have one way of loading.
//
// Additive by default. It adds ninjas DojoLink does not have and touches nobody
// who is already here unless the director ticks them: the CSV import proposes
// archiving everyone absent from the file, and a live pull that behaved the same
// way would empty a roster the first time MyStudio had a bad morning.

// The preview names the fields it would fill and never their values, so a
// child's date of birth is not sent to a browser to say one was found.
const FIELD_LABELS = {
  birthday: 'birthday',
  parent_name: 'parent name',
  parent_email: 'email',
  parent_phone: 'phone',
};

const CHECKBOX =
  'w-4 h-4 rounded border-ninja-border accent-ninja-blue flex-shrink-0 cursor-pointer';

function Section({ title, hint, children }) {
  return (
    <div>
      <p className="font-ninja text-xs font-semibold uppercase tracking-wide text-ninja-muted mb-1.5">
        {title}
      </p>
      {hint && <p className="font-ninja text-xs text-ninja-muted mb-2">{hint}</p>}
      {children}
    </div>
  );
}

export default function MyStudioImport({ onImported }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  // Everyone new starts ticked: adding them is what the button is for. The
  // checkboxes are for the exceptions — a kid who left, a duplicate under a
  // different spelling, a name the director knows is wrong.
  const [addIds, setAddIds] = useState(() => new Set());
  const [beltIds, setBeltIds] = useState(() => new Set());
  const [enrollIds, setEnrollIds] = useState(() => new Set());
  const [detailIds, setDetailIds] = useState(() => new Set());

  const reset = () => {
    setPreview(null);
    setResult(null);
    setError('');
    setAddIds(new Set());
    setBeltIds(new Set());
    setEnrollIds(new Set());
    setDetailIds(new Set());
  };

  const loadPreview = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const next = await api.post('/mystudio/import', { dryRun: true });
      setPreview(next);
      setAddIds(new Set((next.to_add || []).map((row) => row.participant_id)));
    } catch (err) {
      setError(err.message || 'Could not read the MyStudio roster.');
    } finally {
      setBusy(false);
    }
  }, []);

  const openModal = () => {
    setOpen(true);
    reset();
    loadPreview();
  };

  const toggle = (setter) => (id) =>
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const apply = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await api.post('/mystudio/import', {
        add_ids: [...addIds],
        belt_ids: [...beltIds],
        enroll_ids: [...enrollIds],
        detail_ids: [...detailIds],
      });
      setResult(res);
      setPreview(null);
      onImported?.();
    } catch (err) {
      setError(err.message || 'Could not import the MyStudio roster.');
    } finally {
      setBusy(false);
    }
  };

  const toAdd = preview?.to_add || [];
  const beltChanges = preview?.belt_changes || [];
  const newEnrollments = preview?.new_enrollments || [];
  const detailFills = preview?.detail_fills || [];
  const ambiguous = preview?.ambiguous || [];
  const selectedCount = addIds.size + beltIds.size + enrollIds.size + detailIds.size;
  const nothingSelected = selectedCount === 0;
  const applyLabel = addIds.size
    ? `Add ${addIds.size} ${addIds.size === 1 ? 'ninja' : 'ninjas'}`
    : 'Apply changes';
  const nothingToDo =
    preview &&
    !toAdd.length &&
    !beltChanges.length &&
    !newEnrollments.length &&
    !detailFills.length;

  return (
    <>
      <Button variant="secondary" onClick={openModal}>
        Pull from MyStudio
      </Button>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Pull roster from MyStudio"
        width="max-w-lg"
      >
        <div className="space-y-4">
          {busy && !preview && !result && (
            <BouncingDots label="Reading the MyStudio roster" className="py-8" />
          )}

          {error && (
            <p role="alert" className="font-ninja text-sm text-ninja-red">
              {error}
            </p>
          )}

          {result && (
            <div className="space-y-2">
              <p className="font-ninja text-sm text-ninja-navy">
                Added {result.added} {result.added === 1 ? 'ninja' : 'ninjas'} from{' '}
                {result.member_count} at this center.
              </p>
              {(result.enrolled > 0 || result.belts_changed > 0 || result.details_filled > 0) && (
                <p className="font-ninja text-sm text-ninja-muted">
                  {result.enrolled > 0 && `${result.enrolled} new enrollment${result.enrolled === 1 ? '' : 's'}. `}
                  {result.belts_changed > 0 && `${result.belts_changed} belt${result.belts_changed === 1 ? '' : 's'} updated. `}
                  {result.details_filled > 0 && `${result.details_filled} ninja${result.details_filled === 1 ? '' : 's'} had missing details filled in.`}
                </p>
              )}
            </div>
          )}

          {nothingToDo && (
            <p className="font-ninja text-sm text-ninja-navy">
              Nothing to add. All {preview.member_count} ninjas at this center are
              already in DojoLink.
            </p>
          )}

          {preview && !nothingToDo && (
            <>
              <p className="font-ninja text-sm text-ninja-muted">
                MyStudio lists {preview.member_count} ninjas at this center.
                Nothing already in DojoLink changes unless you tick it.
              </p>

              {toAdd.length > 0 && (
                <Section
                  title={`Add ${addIds.size} of ${toAdd.length} new ${toAdd.length === 1 ? 'ninja' : 'ninjas'}`}
                  hint="Ninjas MyStudio has and DojoLink does not. Untick anyone you do not want."
                >
                  {toAdd.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setAddIds(
                          addIds.size === toAdd.length
                            ? new Set()
                            : new Set(toAdd.map((row) => row.participant_id))
                        )
                      }
                      className="font-ninja text-xs text-ninja-muted hover:text-ninja-navy transition-colors mb-2"
                    >
                      {addIds.size === toAdd.length ? 'Deselect all' : 'Select all'}
                    </button>
                  )}
                  <ul className="max-h-52 overflow-y-auto rounded-xl border border-ninja-border divide-y divide-ninja-border">
                    {toAdd.map((row) => (
                      <li key={row.participant_id}>
                        <label className="flex items-center gap-2.5 px-3 py-2 font-ninja text-sm text-ninja-navy cursor-pointer">
                          <input
                            type="checkbox"
                            className={CHECKBOX}
                            checked={addIds.has(row.participant_id)}
                            onChange={() => toggle(setAddIds)(row.participant_id)}
                          />
                          <span className="truncate">{row.full_name}</span>
                          <span className="ml-auto text-xs text-ninja-muted flex-shrink-0">
                            {row.program || 'No program yet'}
                            {row.belt ? ` · ${row.belt}` : ''}
                            {row.fills?.length ? ` · +${row.fills.length} details` : ''}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {newEnrollments.length > 0 && (
                <Section
                  title="New enrollments"
                  hint="Already in DojoLink, and MyStudio has them in a program they are not enrolled in here."
                >
                  <ul className="space-y-1">
                    {newEnrollments.map((row) => (
                      <li key={`${row.id}-${row.program}`}>
                        <label className="flex items-center gap-2.5 font-ninja text-sm text-ninja-navy cursor-pointer">
                          <input
                            type="checkbox"
                            className={CHECKBOX}
                            checked={enrollIds.has(row.id)}
                            onChange={() => toggle(setEnrollIds)(row.id)}
                          />
                          <span className="truncate">{row.full_name}</span>
                          <span className="ml-auto text-xs text-ninja-muted flex-shrink-0">
                            {row.program}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {detailFills.length > 0 && (
                <Section
                  title="Fill in missing details"
                  hint="MyStudio has a birthday or parent contact where DojoLink has a blank. Only blanks are filled, never anything already entered here."
                >
                  <ul className="space-y-1">
                    {detailFills.map((row) => (
                      <li key={row.id}>
                        <label className="flex items-center gap-2.5 font-ninja text-sm text-ninja-navy cursor-pointer">
                          <input
                            type="checkbox"
                            className={CHECKBOX}
                            checked={detailIds.has(row.id)}
                            onChange={() => toggle(setDetailIds)(row.id)}
                          />
                          <span className="truncate">{row.full_name}</span>
                          <span className="ml-auto text-xs text-ninja-muted flex-shrink-0">
                            {row.fields.map((f) => FIELD_LABELS[f] || f).join(', ')}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {beltChanges.length > 0 && (
                <Section
                  title="Belt differences"
                  hint="MyStudio has a different belt on file. Ticking one changes only that program."
                >
                  <ul className="space-y-1">
                    {beltChanges.map((row) => (
                      <li key={`${row.id}-${row.program}`}>
                        <label className="flex items-center gap-2.5 font-ninja text-sm text-ninja-navy cursor-pointer">
                          <input
                            type="checkbox"
                            className={CHECKBOX}
                            checked={beltIds.has(row.id)}
                            onChange={() => toggle(setBeltIds)(row.id)}
                          />
                          <span className="truncate">{row.full_name}</span>
                          <span className="ml-auto text-xs text-ninja-muted flex-shrink-0">
                            {row.current_belt || 'None'} → {row.new_belt}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {ambiguous.length > 0 && (
                <div className="flex items-start gap-2.5 rounded-xl border border-ninja-border p-3">
                  <span aria-hidden className="mt-0.5 text-amber-600 dark:text-amber-400 flex-shrink-0">
                    <TriangleAlertIcon size={16} />
                  </span>
                  <p className="font-ninja text-xs text-ninja-muted">
                    {ambiguous.length} skipped because more than one ninja here
                    shares their name, and picking the wrong one would attach a
                    stranger's record: {ambiguous.map((a) => a.full_name).join(', ')}.
                  </p>
                </div>
              )}
            </>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {preview && !nothingToDo && (
              <Button onClick={apply} disabled={busy || nothingSelected}>
                {busy ? (
                  <span className="flex items-center gap-2">
                    <Loader2Icon size={15} className="animate-spin" aria-hidden />
                    Importing
                  </span>
                ) : (
                  applyLabel
                )}
              </Button>
            )}
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
              {result || nothingToDo ? 'Done' : 'Cancel'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
