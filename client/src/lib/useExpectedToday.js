import { useEffect, useState } from 'react';
import { api } from '../api/client';

// Who is booked into today's classes upstream.
//
// A hook rather than state inside one component, because two places want the
// same answer: the strip above the director's board, and the sensei's "who is
// coming" panel. Both go through one pull, and the server holds that pull for a
// minute, so a second reader costs nothing upstream.
//
// Bookings happen during the day, so this cannot be a snapshot taken when the
// page happened to load. It is not a poll either: one pull is an upstream
// request per booked class against a vendor API this app has no agreement with,
// so a fast interval would mean thousands of requests a day to catch a handful
// of late sign-ups. It refreshes when someone comes back to the tab, and slowly
// while they sit on it. Nothing runs while the tab is hidden, and a minimum gap
// keeps flicking between tabs from turning into a pull each time.
const REFRESH_MS = 5 * 60 * 1000;
const MIN_REFRESH_MS = 60 * 1000;

export default function useExpectedToday(date, { enabled = true } = {}) {
  const [state, setState] = useState({ loading: true, data: null, error: '' });

  useEffect(() => {
    if (!enabled) {
      setState({ loading: false, data: null, error: '' });
      return undefined;
    }

    let cancelled = false;
    let lastLoad = 0;

    const load = ({ quiet = false } = {}) => {
      lastLoad = Date.now();
      if (!quiet) setState({ loading: true, data: null, error: '' });
      api
        .get(`/mystudio/today?date=${date}`)
        .then((data) => {
          if (!cancelled) setState({ loading: false, data, error: '' });
        })
        .catch((err) => {
          // A failed background refresh keeps whatever is on screen. The board
          // emptying out under someone's hands is worse than a minute stale.
          if (cancelled || quiet) return;
          setState({ loading: false, data: null, error: err.message || 'failed' });
        });
    };

    const refreshIfStale = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastLoad < MIN_REFRESH_MS) return;
      load({ quiet: true });
    };

    load();

    const interval = setInterval(refreshIfStale, REFRESH_MS);
    document.addEventListener('visibilitychange', refreshIfStale);
    window.addEventListener('focus', refreshIfStale);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshIfStale);
      window.removeEventListener('focus', refreshIfStale);
    };
  }, [date, enabled]);

  return state;
}

// Booked ninjas, gathered into the classes they are booked into.
//
// The server already sorts by start time then name, so encounter order is the
// order these should appear in and nothing needs re-sorting here.
export function groupByClass(expected) {
  const groups = [];
  const byKey = new Map();

  for (const row of expected || []) {
    const key = `${row.startTime}|${row.className}`;
    let group = byKey.get(key);
    if (!group) {
      group = { key, startTime: row.startTime, className: row.className, rows: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.rows.push(row);
  }

  return groups;
}

// "04:00 PM" reads as a timetable entry; "4:00 PM" reads as a time.
export function prettyTime(value) {
  return String(value || '').replace(/^0/, '');
}
