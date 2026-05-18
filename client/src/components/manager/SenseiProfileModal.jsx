import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BeltBadge from '../ui/BeltBadge';
import Button from '../ui/Button';
import { formatDate } from '../../utils/dateUtils';

function Avatar({ url, name }) {
  const initials = name?.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?';
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
      />
    );
  }
  return (
    <div className="w-20 h-20 rounded-full bg-ninja-blue border-4 border-white shadow-lg flex items-center justify-center">
      <span className="text-white font-ninja font-bold text-2xl">{initials}</span>
    </div>
  );
}

function StatCard({ value, label, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: 'easeOut' }}
      className="flex-1 bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center"
    >
      <p className="text-white font-ninja font-bold text-2xl leading-none">{value}</p>
      <p className="text-white/70 font-ninja text-xs mt-1">{label}</p>
    </motion.div>
  );
}

export default function SenseiProfileModal({
  isOpen, onClose, sensei, logs = [],
  isManager, isReadOnly, onEditLogin, onRemove,
}) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const touchStartY = useRef(null);

  const handleClose = () => {
    setConfirmingRemove(false);
    onClose();
  };

  // Swipe-down-to-dismiss: only tracked from the header area
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e) => {
    if (touchStartY.current === null) return;
    if (e.changedTouches[0].clientY - touchStartY.current > 80) handleClose();
    touchStartY.current = null;
  };

  const joinYear = sensei?.created_at
    ? new Date(sensei.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '—';

  return (
    <AnimatePresence>
      {isOpen && sensei && (
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          key="panel"
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="w-full sm:max-w-md bg-ninja-bg rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          style={{ maxHeight: '90vh' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Hero header — touch here to swipe-dismiss */}
          <div
            className="relative bg-ninja-navy px-6 pt-8 pb-6 flex-shrink-0"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src="/CodeNinjasIcon.svg"
              alt=""
              className="absolute right-4 top-4 w-16 h-16 opacity-10 pointer-events-none select-none"
            />

            {/* Large-tap drag handle — also closes on tap */}
            <button
              onClick={handleClose}
              className="absolute top-0 left-0 right-0 h-8 sm:hidden flex items-center justify-center"
              aria-label="Close"
            >
              <span className="block w-10 h-1 rounded-full bg-white/40" />
            </button>

            <div className="flex items-end gap-4 mb-5">
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 20, stiffness: 260, delay: 0.05 }}
              >
                <Avatar url={sensei.profile_pic_url} name={sensei.display_name} />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="pb-1"
              >
                <p className="text-white font-ninja font-bold text-xl leading-tight">{sensei.display_name}</p>
                <p className="text-white/60 font-ninja text-sm mt-0.5">@{sensei.username}</p>
                <span className="inline-block mt-2 px-2.5 py-0.5 bg-ninja-blue/30 border border-ninja-blue/40 rounded-full text-ninja-blue text-[10px] font-ninja font-bold uppercase tracking-wider">
                  {sensei.role === 'manager' ? 'Center Director' : 'Sensei'}
                </span>
              </motion.div>
            </div>

            <div className="flex gap-2">
              <StatCard value={logs.length} label="Progress Logs" delay={0.15} />
              <StatCard value={joinYear} label="Joined" delay={0.2} />
            </div>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 min-h-0">
            <div className="px-5 py-4">
              <p className="text-ninja-muted font-ninja font-semibold text-xs uppercase tracking-widest mb-3">
                Recent Logs
              </p>

              {logs.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className="text-center py-10"
                >
                  <img src="/CodeNinjasIcon.svg" alt="" className="w-10 h-10 opacity-10 mx-auto mb-3" />
                  <p className="text-ninja-muted font-ninja text-sm">No progress logs yet.</p>
                </motion.div>
              ) : (
                <div className="space-y-2.5">
                  {logs.map((log, i) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.05, duration: 0.25, ease: 'easeOut' }}
                      className="bg-white border border-ninja-border rounded-xl p-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-ninja font-bold text-ninja-navy text-sm">{log.student_name}</span>
                        <span className="text-ninja-muted font-ninja text-xs flex-shrink-0">{formatDate(log.session_date)}</span>
                      </div>
                      {log.belt_level_at && (
                        <div className="mb-1.5">
                          <BeltBadge belt={log.belt_level_at} sublevel={log.belt_sublevel_at} size="xs" />
                        </div>
                      )}
                      {log.notes && (
                        <p className="text-ninja-muted font-ninja text-sm leading-relaxed line-clamp-2">{log.notes}</p>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {isManager && !isReadOnly && (
              <div
                className="px-5 pt-2 border-t border-ninja-border flex gap-2"
                style={{ paddingBottom: 'max(1.5rem, calc(env(safe-area-inset-bottom, 0px) + 1.5rem))' }}
              >
                <Button variant="secondary" className="flex-1" onClick={() => { handleClose(); onEditLogin(); }}>
                  Edit Login
                </Button>
                {sensei.role !== 'manager' && (
                  confirmingRemove ? (
                    <>
                      <Button variant="danger" onClick={() => { onRemove(); handleClose(); }}>Confirm</Button>
                      <Button variant="secondary" onClick={() => setConfirmingRemove(false)}>Cancel</Button>
                    </>
                  ) : (
                    <Button variant="danger" onClick={() => setConfirmingRemove(true)}>Remove</Button>
                  )
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
