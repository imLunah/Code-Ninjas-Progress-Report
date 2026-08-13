import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import useLiveRefresh from './useLiveRefresh';

// Who is booked into today's classes upstream.
//
// A hook rather than state inside one component, because two places want the
// same answer: the strip above the director's board, and the sensei's "who is
// coming" panel. Both go through one pull, and the server holds that pull for a
// minute, so a second reader costs nothing upstream.
//
// Bookings happen during the day, so this cannot be a snapshot taken when the
// page happened to load. Refresh behaviour is useLiveRefresh's, tuned slower
// here: one pull is an upstream request per booked class.

export default function useExpectedToday(date, { enabled = true } = {}) {
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  // The answer is per center, and switching centers does not remount the
  // page, so without this in the dependencies a director moving from Yorba
  // Linda to Fullerton keeps Yorba Linda's bookings until they reload. Read
  // here rather than passed in, so no caller can forget it.
  const { user } = useAuth();
  const locationId = user?.activeLocation?.id;

  const load = useCallback(
    ({ quiet = false } = {}) => {
      if (!enabled) return;
      if (!quiet) setState({ loading: true, data: null, error: '' });
      api
        .get(`/mystudio/today?date=${date}`)
        .then((data) => setState({ loading: false, data, error: '' }))
        .catch((err) => {
          // A failed background refresh keeps whatever is on screen.
          if (quiet) return;
          setState({ loading: false, data: null, error: err.message || 'failed' });
        });
    },
    [date, enabled, locationId]
  );

  useEffect(() => {
    if (!enabled) {
      setState({ loading: false, data: null, error: '' });
      return;
    }
    load();
  }, [load, enabled]);

  // Slower than the board's own refresh: a booking made mid-afternoon is worth
  // noticing, and one pull is an upstream request per booked class against a
  // vendor API with no agreement behind it.
  useLiveRefresh(() => load({ quiet: true }), { intervalMs: 5 * 60 * 1000, minGapMs: 60 * 1000, enabled });

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
      group = {
        key,
        startTime: row.startTime,
        className: row.className,
        isClub: Boolean(row.isClub),
        rows: [],
      };
      byKey.set(key, group);
      groups.push(group);
    }
    group.rows.push(row);
  }

  return groups;
}

// People, not bookings. The same ninja can be booked into two classes on one
// day and appears once per class, so a plain length counts the day twice.
export function countNinjas(expected) {
  return new Set((expected || []).map((row) => row.participantId)).size;
}

// The belt colour behind a rank string, when there is one.
//
// MyStudio's rank is free text: "White Belt 3" is a belt, "ScratchJR" is not.
// A swatch where one can be read makes a list of names scannable by belt without
// asking anybody to read the word.
const BELT_COLORS = {
  white: '#ffffff', yellow: '#fbbf24', orange: '#f97316', green: '#22c55e',
  blue: '#3b82f6', purple: '#a855f7', brown: '#92400e', red: '#cc0000',
  black: '#111111', bronze: '#cd7f32', silver: '#c0c0c0', gold: '#f59e0b',
  platinum: '#e5e4e2',
};

export function beltColor(rankName) {
  const text = String(rankName || '').toLowerCase();
  const hit = Object.keys(BELT_COLORS).find((name) => text.includes(name));
  return hit ? BELT_COLORS[hit] : null;
}

// "04:00 PM" reads as a timetable entry; "4:00 PM" reads as a time.
export function prettyTime(value) {
  return String(value || '').replace(/^0/, '');
}
