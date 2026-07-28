import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BeltBadge from '../ui/BeltBadge';
import { formatDate } from '../../utils/dateUtils';

// Strip markdown syntax for compact one/two-line previews where rendered
// formatting would break the line-clamp.
function stripMarkdown(text = '') {
  return text
    .replace(/[*_`#>]/g, '')
    .replace(/^\s*[-+]\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();
}

function Avatar({ url, name }) {
  const [imgError, setImgError] = useState(false);
  const initials = name?.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?';
  if (url && !imgError) {
    return (
      <img
        src={url}
        alt={name}
        onError={() => setImgError(true)}
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
      className="flex-1 bg-ninja-navy/10 backdrop-blur-sm rounded-xl p-3 text-center"
    >
      <p className="text-ninja-navy font-ninja font-bold text-2xl leading-none">{value}</p>
      <p className="text-ninja-muted font-ninja text-xs mt-1">{label}</p>
    </motion.div>
  );
}

export default function SenseiProfileModal({
  isOpen, onClose, sensei, logs = [],
  isManager, isReadOnly, onEditLogin, onResetLogin, onRemove, onManageCenters, centers = [],
}) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const touchStartY = useRef(null);

  const isCD = sensei?.role === 'manager';
  const showActions = isManager && !isReadOnly;
  const heroBtn = 'px-3 py-1.5 rounded-lg text-xs font-ninja font-semibold transition-colors';

  const centerNames = (sensei?.location_ids || [])
    .map((id) => centers.find((c) => c.id === id)?.name)
    .filter(Boolean);

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
            className="relative bg-[#dbe4f2] dark:bg-ninja-hero px-6 pt-8 pb-6 flex-shrink-0"
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
              <span className="block w-10 h-1 rounded-full bg-ninja-navy/30" />
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
                <p className="text-ninja-navy font-ninja font-bold text-xl leading-tight">{sensei.display_name}</p>
                <p className="text-ninja-muted font-ninja text-sm mt-0.5">@{sensei.username}</p>
                {/* Plain line, not an uppercase pill. The role is a fact about
                    this person, not a status that needs a coloured badge. */}
                <p className="text-ninja-muted font-ninja text-sm mt-1">
                  {sensei.role === 'manager' ? 'Center Director' : 'Sensei'}
                </p>
              </motion.div>
            </div>

            {showActions && (
              <div className="flex flex-wrap gap-2 mb-5">
                <button className={`${heroBtn} bg-ninja-navy/10 hover:bg-ninja-navy/20 text-ninja-navy`} onClick={() => { handleClose(); onResetLogin(); }}>
                  Reset Login
                </button>
                {onManageCenters && centers.length > 1 && (
                  <button className={`${heroBtn} bg-ninja-navy/10 hover:bg-ninja-navy/20 text-ninja-navy`} onClick={() => { handleClose(); onManageCenters(); }}>
                    Manage Centers
                  </button>
                )}
                {!isCD && (
                  confirmingRemove ? (
                    <>
                      <button className={`${heroBtn} bg-ninja-red hover:opacity-90 text-white`} onClick={() => { onRemove(); handleClose(); }}>Confirm Remove</button>
                      <button className={`${heroBtn} bg-ninja-navy/10 hover:bg-ninja-navy/20 text-ninja-navy`} onClick={() => setConfirmingRemove(false)}>Cancel</button>
                    </>
                  ) : (
                    <button className={`${heroBtn} bg-ninja-red/15 hover:bg-ninja-red/25 text-ninja-red dark:text-red-300`} onClick={() => setConfirmingRemove(true)}>Remove</button>
                  )
                )}
              </div>
            )}

            <div className="flex gap-2">
              <StatCard value={logs.length} label="Progress Logs" delay={0.15} />
              <StatCard value={joinYear} label="Joined" delay={0.2} />
            </div>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 min-h-0">
            {centerNames.length > 0 && (
              <div className="px-5 pt-4">
                <p className="text-ninja-muted font-ninja font-semibold text-xs uppercase tracking-widest mb-2">
                  Centers
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {centerNames.map((name) => (
                    <span key={name} className="inline-block px-2.5 py-0.5 bg-ninja-bg border border-ninja-border rounded-full text-ninja-navy text-xs font-ninja font-semibold">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

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
                        <p className="text-ninja-muted font-ninja text-sm leading-relaxed line-clamp-2">{stripMarkdown(log.notes)}</p>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
