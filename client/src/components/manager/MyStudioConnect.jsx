import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlugZapIcon,
  CircleCheckIcon,
  TriangleAlertIcon,
  Trash2Icon,
  Loader2Icon,
} from 'lucide-react';
import Modal from '../ui/Modal';
import SidePanel from '../ui/SidePanel';
import Button from '../ui/Button';
import { api } from '../../api/client';
import useIsDesktop from '../../lib/useIsDesktop';

// Connecting a center to the studio management system it already uses.
//
// The upstream product has no API keys and no OAuth, so the only credential
// there is to hand over is a signed-in session. That is why this asks for a
// cookie rather than a password: a password would have to be stored to be
// useful, and the sign-in needs an emailed code anyway, so storing it would buy
// nothing and risk everything. The cookie goes straight to the server, is
// encrypted before it is written down, and is never sent back.
//
// A connection belongs to the center, not to the person who set it up. Upstream
// accounts are scoped to one center each, so a director connecting their account
// is connecting their center, and the next director there inherits it.

const FIELD =
  'w-full bg-ninja-bg border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue';

// Copy as cURL, because the honest alternative is worse.
//
// Two of the values that authorize the connection are httpOnly, so the console
// cannot read them and no button on this page can fetch them. Someone has to go
// into devtools once. The first version of these steps said to find the cookie
// row inside Request Headers, and the first person to read it got stuck, which
// is fair: that is a developer's instruction. Copy as cURL is one menu item in a
// place people already right click, it always contains the cookie, and the
// server pulls it out of whatever lands on the clipboard.
const STEPS = [
  'Sign in to MyStudio in another tab.',
  'Press F12 to open devtools, then click the Network tab.',
  'Reload the page. A list of requests appears.',
  'Right click any row, choose Copy, then Copy as cURL.',
  'Paste the whole thing below. Only the cookie part is kept.',
];

function formatWhen(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function MyStudioConnect({ isOpen, onClose, status, onChanged, centerName }) {
  const isDesktop = useIsDesktop();
  const [cookie, setCookie] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);

  // A closed panel keeps nothing. The field held a live credential, and the
  // confirm should not still be armed the next time this opens.
  useEffect(() => {
    if (isOpen) return;
    setCookie('');
    setError('');
    setBusy(false);
    setConfirmingDisconnect(false);
  }, [isOpen]);

  const connect = useCallback(async () => {
    if (!cookie.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const next = await api.post('/mystudio/connect', { cookie });
      setCookie('');
      onChanged?.(next);
      onClose();
    } catch (err) {
      setError(err.message || 'Could not connect.');
    } finally {
      setBusy(false);
    }
  }, [cookie, busy, onChanged, onClose]);

  const disconnect = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const next = await api.delete('/mystudio/connect');
      onChanged?.(next);
      onClose();
    } catch (err) {
      setError(err.message || 'Could not disconnect.');
      setConfirmingDisconnect(false);
    } finally {
      setBusy(false);
    }
  }, [busy, onChanged, onClose]);

  const connected = status?.connected;
  const expired = connected && status.status === 'expired';
  const lastSynced = formatWhen(status?.lastSyncedAt);

  const body = (
    <div className="space-y-4">
      {!status?.configured && (
        <p className="font-ninja text-sm text-ninja-navy rounded-xl border border-ninja-border bg-ninja-bg p-3">
          MyStudio is not set up on the server yet, so connecting is turned off.
        </p>
      )}

      {connected && (
        <div className="rounded-xl border border-ninja-border p-3">
          <div className="flex items-start gap-2.5">
            <span
              aria-hidden
              className={
                expired
                  ? 'mt-0.5 text-amber-600 dark:text-amber-400'
                  : 'mt-0.5 text-emerald-600 dark:text-emerald-400'
              }
            >
              {expired ? <TriangleAlertIcon size={17} /> : <CircleCheckIcon size={17} />}
            </span>
            <div className="min-w-0">
              {/* MyStudio's own name for the center is the best label, but it
                  comes from a session that expires sooner than the credential
                  does, so it is often missing. Our name for the same center says
                  more than "Connected center" ever did. */}
              <p className="font-ninja text-sm font-semibold text-ninja-navy">
                {status.companyName || centerName || 'Connected'}
              </p>
              <p className="font-ninja text-xs text-ninja-muted">
                {expired
                  ? 'The MyStudio session ran out. Paste a fresh cookie to pick it back up.'
                  : lastSynced
                    ? `Last checked ${lastSynced}`
                    : 'Connected. Nothing pulled yet.'}
              </p>
              {status.connectedByName && (
                <p className="font-ninja text-xs text-ninja-muted mt-0.5">
                  Set up by {status.connectedByName}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div>
        <p className="font-ninja text-xs font-semibold uppercase tracking-wide text-ninja-muted mb-2">
          {connected ? 'Replace the cookie' : 'How to find your cookie'}
        </p>
        <ol className="space-y-1.5 mb-3">
          {STEPS.map((step, i) => (
            <li key={step} className="flex gap-2.5 font-ninja text-xs text-ninja-muted">
              <span className="flex-shrink-0 w-4 h-4 rounded-full bg-ninja-bg border border-ninja-border grid place-items-center text-[10px] font-semibold text-ninja-navy">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        <label htmlFor="mystudio-cookie" className="sr-only">
          MyStudio cookie
        </label>
        <textarea
          id="mystudio-cookie"
          value={cookie}
          onChange={(e) => setCookie(e.target.value)}
          rows={4}
          spellCheck={false}
          autoComplete="off"
          placeholder={"curl 'https://codeninjas.mystudio.io/...' \\\n  -H 'cookie: companyId=...; kc_refresh=...'"}
          className={`${FIELD} resize-none font-mono text-xs`}
          disabled={busy || !status?.configured}
        />
        <p className="font-ninja text-xs text-ninja-muted mt-1.5">
          Treated like a password: encrypted on the server, never shown again, and
          only used to read your class schedule. DojoLink never writes anything
          back to MyStudio.
        </p>
      </div>

      {error && (
        <p role="alert" className="font-ninja text-sm text-ninja-red">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={connect} disabled={!cookie.trim() || busy || !status?.configured}>
          {busy ? (
            <span className="flex items-center gap-2">
              <Loader2Icon size={15} className="animate-spin" aria-hidden />
              Checking
            </span>
          ) : connected ? (
            'Save new cookie'
          ) : (
            'Connect'
          )}
        </Button>

        {connected && (
          <AnimatePresence mode="wait" initial={false}>
            {confirmingDisconnect ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2"
              >
                <button
                  type="button"
                  onClick={disconnect}
                  disabled={busy}
                  className="font-ninja text-sm font-semibold rounded-lg px-3 py-2 bg-ninja-red text-white transition-colors hover:brightness-95 disabled:opacity-60"
                >
                  Disconnect
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDisconnect(false)}
                  className="font-ninja text-sm text-ninja-muted hover:text-ninja-navy transition-colors"
                >
                  Keep it
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="ask"
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={() => setConfirmingDisconnect(true)}
                className="flex items-center gap-1.5 font-ninja text-sm text-ninja-muted hover:text-ninja-red transition-colors"
              >
                <Trash2Icon size={15} aria-hidden />
                Disconnect
              </motion.button>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );

  const title = connected ? 'MyStudio connection' : 'Connect MyStudio';

  // Beside the page on desktop, a dialog below it. Same two-shell rule the task
  // editor follows, from the one shared media query.
  return isDesktop ? (
    <SidePanel isOpen={isOpen} onClose={onClose} title={title}>
      {body}
    </SidePanel>
  ) : (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {body}
    </Modal>
  );
}

// The row that lives in the account page's experimental block.
export function MyStudioRow({ status, onOpen, centerName }) {
  const connected = status?.connected;
  const expired = connected && status.status === 'expired';

  return (
    <button
      type="button"
      onClick={onOpen}
      className="mt-3 w-full flex items-center justify-between rounded-xl border border-ninja-border p-3 text-left transition-[transform,border-color] duration-150 ease-[var(--ease-out)] hover:border-ninja-blue/50 active:scale-[0.98]"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center text-ninja-blue-ink bg-ninja-blue/10 flex-shrink-0">
          <PlugZapIcon size={17} />
        </span>
        <div className="min-w-0">
          <p className="text-ninja-navy font-ninja font-semibold text-sm">MyStudio schedule</p>
          <p className="text-ninja-muted font-ninja text-xs truncate">
            {expired
              ? 'Session ran out. Reconnect to keep pulling.'
              : connected
                ? `${status.companyName || centerName || 'Connected'}. Today's classes appear on the board.`
                : "Pull today's booked ninjas onto the board"}
          </p>
        </div>
      </div>
      <span
        aria-hidden
        className={`flex-shrink-0 ml-2 w-2 h-2 rounded-full ${
          expired ? 'bg-amber-500' : connected ? 'bg-emerald-500' : 'bg-ninja-border'
        }`}
      />
    </button>
  );
}
