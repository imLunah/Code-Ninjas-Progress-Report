import { useState } from 'react';
import { PencilIcon, Trash2Icon, ArrowLeftIcon, ArrowRightIcon, ArchiveIcon, ArchiveRestoreIcon } from 'lucide-react';
import ActionMenu, { MenuItem } from '../ui/ActionMenu';
import { COLUMN_KEYS, COLUMN_LABEL } from '../../lib/taskBoard';

// Everything a card can have done to it, in one menu, so the board and the list
// offer the same actions rather than each growing its own set.
export default function TaskActionsMenu({ task, onOpen, onDelete, onArchive, onRestore, onMoveTo, className = '' }) {
  const [confirming, setConfirming] = useState(false);
  const archived = Boolean(task.archived_at);

  return (
    <ActionMenu label="Task actions" className={className} onClosed={() => setConfirming(false)}>
      {({ close }) =>
        confirming ? (
          // A destructive confirm keeps its word. Everything else here is a
          // glyph; nothing irreversible rests on recognising one.
          <div className="p-1.5 w-44">
            <p className="font-ninja text-xs text-ninja-muted px-1 pb-2 leading-snug">
              Delete this task? This can't be undone.
            </p>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => { onDelete(task); close({ restoreFocus: false }); }}
                className="flex-1 py-1.5 rounded-lg bg-ninja-red text-white font-ninja text-xs font-bold transition-transform duration-150 ease-[var(--ease-out)] active:scale-95"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="flex-1 py-1.5 rounded-lg bg-ninja-bg text-ninja-navy font-ninja text-xs font-bold transition-transform duration-150 ease-[var(--ease-out)] active:scale-95"
              >
                Keep
              </button>
            </div>
          </div>
        ) : archived ? (
          <MenuItem icon={ArchiveRestoreIcon} onSelect={() => { close(); onRestore(task); }}>
            Put back on the board
          </MenuItem>
        ) : (
          <>
            <MenuItem icon={PencilIcon} onSelect={() => { close(); onOpen(); }}>
              Edit
            </MenuItem>
            {/* The keyboard and touch route between columns, and the only route
                below xl or while a filter is on. The arrow points the way the
                card will actually travel: from the middle of the board some of
                these go backwards, and four arrows pointing right would say
                otherwise. */}
            {COLUMN_KEYS.filter((k) => k !== task.column_key).map((k) => {
              const back = COLUMN_KEYS.indexOf(k) < COLUMN_KEYS.indexOf(task.column_key);
              return (
                <MenuItem
                  key={k}
                  icon={back ? ArrowLeftIcon : ArrowRightIcon}
                  onSelect={() => { close(); onMoveTo(task, k); }}
                >
                  Move to {COLUMN_LABEL[k]}
                </MenuItem>
              );
            })}
            {/* Archive sits above Delete, and is the one people should reach
                for: the work happened either way. */}
            <MenuItem icon={ArchiveIcon} onSelect={() => { close(); onArchive(task); }}>
              Archive
            </MenuItem>
            <MenuItem icon={Trash2Icon} danger onSelect={() => setConfirming(true)}>
              Delete
            </MenuItem>
          </>
        )
      }
    </ActionMenu>
  );
}
