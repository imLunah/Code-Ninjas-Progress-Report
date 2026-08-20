import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StaffBadge from '../shared/StaffBadge';
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

// The staff profile is a desk: the ID card in front, and a sheet of paper
// tucked behind it carrying their progress logs. Selecting the paper brings
// it forward to read; selecting the card brings the card back. Nothing else
// is in the modal, because everything the old sections said is printed on
// one of the two objects.
//
// The paper is a physical object like the card: inline hex throughout, one
// look in both themes, because .dark .bg-white would turn a Tailwind-painted
// sheet slate.

const PAPER_W = 280;
const PAPER_H = 416;

const spring = { type: 'spring', damping: 26, stiffness: 260 };

function PaperSheet({ logs }) {
  return (
    <div
      className="flex flex-col font-ninja"
      style={{
        width: PAPER_W,
        height: PAPER_H,
        background: '#fdfdf8',
        color: '#1a2e4a',
        borderRadius: 10,
        boxShadow: '0 24px 48px -18px rgba(10, 20, 40, 0.4)',
        padding: '18px 18px 14px',
      }}
    >
      <div className="flex items-baseline justify-between" style={{ borderBottom: '1.5px solid rgba(26,46,74,0.15)', paddingBottom: 8 }}>
        <span className="font-black" style={{ fontSize: 15 }}>Progress Logs</span>
        <span className="font-bold" style={{ fontSize: 12, color: '#506690' }}>{logs.length}</span>
      </div>
      {logs.length === 0 ? (
        <p className="text-center" style={{ fontSize: 13, color: '#506690', marginTop: 48 }}>No progress logs yet.</p>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto" style={{ marginTop: 4 }}>
          {logs.map((log, i) => (
            <div key={log.id} style={{ padding: '10px 0', borderBottom: i < logs.length - 1 ? '1px solid rgba(26,46,74,0.08)' : 'none' }}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-bold" style={{ fontSize: 13 }}>{log.student_name}</span>
                <span className="flex-shrink-0" style={{ fontSize: 11, color: '#506690' }}>{formatDate(log.session_date)}</span>
              </div>
              {log.belt_level_at && (
                <p className="font-bold" style={{ fontSize: 11, color: '#006add', marginTop: 1 }}>
                  {log.belt_level_at}{log.belt_sublevel_at ? ` · Level ${log.belt_sublevel_at}` : ''}
                </p>
              )}
              {log.notes && (
                <p className="line-clamp-2" style={{ fontSize: 12, color: '#506690', lineHeight: 1.5, marginTop: 2 }}>
                  {stripMarkdown(log.notes)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SenseiProfileModal({
  isOpen, onClose, sensei, logs = [],
  isManager, isReadOnly, onEditLogin, onResetLogin, onRemove, onManageCenters, centers = [],
}) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  // 'card' or 'logs': which of the two objects is in front.
  const [view, setView] = useState('card');
  const touchStartY = useRef(null);

  const isCD = sensei?.role === 'manager';
  const showActions = isManager && !isReadOnly;
  const heroBtn = 'px-3 py-1.5 rounded-lg text-xs font-ninja font-semibold transition-colors';

  const centerNames = (sensei?.location_ids || [])
    .map((id) => centers.find((c) => c.id === id)?.name)
    .filter(Boolean);

  const handleClose = () => {
    setConfirmingRemove(false);
    setView('card');
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

  const cardInFront = view === 'card';

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
         <div className="overflow-y-auto flex-1 min-h-0">
          <div
            className="relative px-4 pt-8 pb-4"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Large-tap drag handle — also closes on tap */}
            <button
              onClick={handleClose}
              className="absolute top-0 left-0 right-0 h-8 sm:hidden flex items-center justify-center z-10"
              aria-label="Close"
            >
              <span className="block w-10 h-1 rounded-full bg-ninja-navy/30" />
            </button>

            {/* The desk. Touch stops here so handling either object can never
                read as the swipe-down-to-dismiss. */}
            <div
              className="relative mx-auto"
              style={{ height: 480, maxWidth: 400 }}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              {/* The paper, tucked behind the card until selected. */}
              <motion.div
                className="absolute left-1/2 top-1/2"
                initial={false}
                animate={cardInFront
                  ? { x: -PAPER_W / 2 + 62, y: -PAPER_H / 2 - 4, rotate: 8, scale: 0.9 }
                  : { x: -PAPER_W / 2, y: -PAPER_H / 2 + 8, rotate: 0, scale: 1 }}
                transition={spring}
                style={{ zIndex: cardInFront ? 1 : 2 }}
              >
                <div style={{ pointerEvents: cardInFront ? 'none' : 'auto' }}>
                  <PaperSheet logs={logs} />
                </div>
                {cardInFront && (
                  <button
                    type="button"
                    onClick={() => setView('logs')}
                    className="absolute inset-0 rounded-lg"
                    aria-label={`Read the progress logs (${logs.length})`}
                  />
                )}
              </motion.div>

              {/* The badge. */}
              {/* Centring is baked into margins (badge stage at scale 0.56 is
                  216x319) so both animation states are plain numbers — framer
                  cannot tween a percentage into a calc(), it snaps. */}
              <motion.div
                className="absolute left-1/2 top-1/2"
                initial={false}
                animate={cardInFront
                  ? { x: 0, y: 0, rotate: 0, scale: 1 }
                  : { x: -105, y: 10, rotate: -9, scale: 0.62 }}
                transition={spring}
                style={{ zIndex: cardInFront ? 2 : 1, marginLeft: -108, marginTop: -160 }}
              >
                <div style={{ pointerEvents: cardInFront ? 'auto' : 'none' }}>
                  <StaffBadge
                    name={sensei.display_name}
                    username={sensei.username}
                    avatar={sensei.profile_pic_url}
                    role={sensei.role === 'manager' ? 'Center Director' : 'Sensei'}
                    center={centerNames[0]}
                    scale={0.56}
                    details={[
                      { label: 'Joined', value: joinYear },
                      { label: 'Logs', value: logs.length },
                    ]}
                  />
                </div>
                {!cardInFront && (
                  <button
                    type="button"
                    onClick={() => setView('card')}
                    className="absolute inset-0"
                    aria-label="Bring the card back"
                  />
                )}
              </motion.div>
            </div>

            <p className="text-ninja-muted font-ninja text-xs text-center mt-1">
              {cardInFront
                ? 'Drag the card to turn it over. The paper behind it holds their logs.'
                : 'Tap the card to bring it back.'}
            </p>

            {showActions && (
              <div className="flex flex-wrap justify-center gap-2 mt-4">
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
          </div>
         </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
