import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import ReleaseContent from './ReleaseContent';

// Globally mounted (App.jsx). On login, fetches releases the user hasn't seen and
// pops a "What's New" modal. Closing marks everything published-so-far as seen.
export default function WhatsNewModal() {
  const { user } = useAuth();
  const [releases, setReleases] = useState([]);
  const [open, setOpen] = useState(false);
  const checkedFor = useRef(null);

  useEffect(() => {
    if (!user) { setOpen(false); setReleases([]); checkedFor.current = null; return; }
    // Force-reset users must clear that first; don't interrupt with the modal.
    if (user.mustResetPassword) return;
    if (checkedFor.current === user.id) return;
    checkedFor.current = user.id;
    api.get('/releases/unseen')
      .then((rows) => {
        if (Array.isArray(rows) && rows.length) { setReleases(rows); setOpen(true); }
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const dismiss = () => {
    setOpen(false);
    api.post('/releases/seen', {}).catch(() => {});
  };

  if (!open || !releases.length) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex flex-col bg-ninja-bg lg:bg-ninja-navy/50 lg:items-center lg:justify-center lg:p-6"
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <div
        className="w-full flex-1 flex flex-col overflow-hidden lg:flex-none lg:max-h-[90dvh] lg:rounded-2xl lg:bg-ninja-bg lg:shadow-xl lg:border lg:border-ninja-border max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 flex items-center justify-between px-5 pt-5 pb-3 lg:border-b lg:border-ninja-border">
          <div>
            <p className="text-ninja-blue font-ninja text-xs font-bold uppercase tracking-wide">What's New</p>
            <h2 className="text-xl font-bold font-ninja text-ninja-navy">
              {releases.length > 1 ? `${releases.length} updates` : 'Latest update'}
            </h2>
          </div>
          <button
            onClick={dismiss}
            className="hidden lg:block text-ninja-muted hover:text-ninja-navy transition-colors text-2xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-6">
          {releases.map((r, i) => (
            <div key={r.id} className={i > 0 ? 'pt-6 border-t border-ninja-border' : ''}>
              <ReleaseContent release={r} />
            </div>
          ))}
        </div>

        <div className="flex-shrink-0 px-5 pt-3 pb-[max(env(safe-area-inset-bottom),16px)] lg:pb-4 border-t border-ninja-border">
          <button
            onClick={dismiss}
            className="w-full py-3 rounded-xl bg-ninja-blue text-white font-ninja font-semibold text-sm hover:bg-ninja-blue/90 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
