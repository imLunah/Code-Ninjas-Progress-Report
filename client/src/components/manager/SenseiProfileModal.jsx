import { useState } from 'react';
import Modal from '../ui/Modal';
import BeltBadge from '../ui/BeltBadge';
import Button from '../ui/Button';
import { formatDate } from '../../utils/dateUtils';

export default function SenseiProfileModal({ isOpen, onClose, sensei, logs = [], isManager, isReadOnly, onEditLogin, onRemove }) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  if (!sensei) return null;

  const handleClose = () => {
    setConfirmingRemove(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={sensei.display_name} width="max-w-xl">
      <div className="space-y-5">
        {/* Header info */}
        <div className="flex items-center justify-between pb-4 border-b border-ninja-border">
          <div>
            <p className="text-ninja-muted font-ninja text-sm">@{sensei.username}</p>
            <p className="text-ninja-muted font-ninja text-xs mt-0.5">
              Joined {new Date(sensei.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold font-ninja text-ninja-blue">{logs.length}</p>
            <p className="text-ninja-muted font-ninja text-xs">Progress Logs</p>
          </div>
        </div>

        {/* Progress logs */}
        <div>
          <h3 className="text-ninja-muted font-ninja font-semibold text-xs uppercase tracking-widest mb-3">
            Progress Log History
          </h3>
          {logs.length === 0 ? (
            <p className="text-ninja-muted font-ninja text-sm text-center py-8">No progress logs yet.</p>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {logs.map((log) => (
                <div key={log.id} className="bg-ninja-bg border border-ninja-border rounded-xl p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <span className="font-ninja font-bold text-ninja-navy text-sm">{log.student_name}</span>
                    <span className="text-ninja-muted font-ninja text-xs">{formatDate(log.session_date)}</span>
                  </div>
                  {log.belt_level_at && (
                    <div className="mb-1">
                      <BeltBadge belt={log.belt_level_at} sublevel={log.belt_sublevel_at} size="xs" />
                    </div>
                  )}
                  <p className="text-ninja-navy font-ninja text-sm leading-relaxed">{log.notes}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

        {isManager && !isReadOnly && (
          <div className="sm:hidden pt-4 border-t border-ninja-border flex gap-2">
            <Button variant="secondary" onClick={() => { handleClose(); onEditLogin(); }}>Edit Login</Button>
            {confirmingRemove ? (
              <>
                <Button variant="danger" onClick={() => { onRemove(); handleClose(); }}>Confirm</Button>
                <Button variant="secondary" onClick={() => setConfirmingRemove(false)}>Cancel</Button>
              </>
            ) : (
              <Button variant="danger" onClick={() => setConfirmingRemove(true)}>Remove</Button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
