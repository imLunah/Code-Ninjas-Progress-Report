import { useEffect, useRef } from 'react';

// Keeping a shared screen current while somebody else is changing it.
//
// A center runs one board and several people. A sensei logs a ninja at the back
// desk and the director at the front is looking at a page that says otherwise,
// which is exactly the moment a check-in gets entered twice.
//
// Polling rather than a live connection, because the server is Vercel functions:
// nothing here can hold a socket open, and an SSE stream would be a function
// billed for the length of a shift. So: a slow interval while the tab is
// visible, an immediate refresh when somebody comes back to it, and nothing at
// all while it is hidden. Coming back to the tab is when a stale board actually
// matters, and it is also the cheapest moment to notice.
//
// The callback is held in a ref so a component can pass a fresh closure every
// render without tearing down and re-arming the timer each time.
export default function useLiveRefresh(
  onRefresh,
  { intervalMs = 30000, minGapMs = 5000, enabled = true } = {}
) {
  const saved = useRef(onRefresh);
  saved.current = onRefresh;

  useEffect(() => {
    if (!enabled) return undefined;

    // Starts "just refreshed", because the caller has almost always loaded the
    // data itself a moment ago and does not want it fetched twice on mount.
    let last = Date.now();

    const run = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - last < minGapMs) return;
      last = Date.now();
      saved.current();
    };

    const interval = setInterval(run, intervalMs);
    document.addEventListener('visibilitychange', run);
    window.addEventListener('focus', run);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', run);
      window.removeEventListener('focus', run);
    };
  }, [intervalMs, minGapMs, enabled]);
}
