// When the centers are open. One table for all three: Monday to Friday
// 3 to 7, Saturday 10 to 2, closed Sunday. Hours are 24h, [open, close).
//
// The parent home's live schedule draws one bar per open hour and files each
// check-in under the hour it was closest to. A ninja who arrives at 6:40 is
// rounded to 7 and then pulled back to the 6 o'clock bar, because 7 is when
// the doors close and there is no 7 o'clock hour to be in.

export const OPEN_HOURS = {
  1: [15, 19], 2: [15, 19], 3: [15, 19], 4: [15, 19], 5: [15, 19],
  6: [10, 14],
};

// { open, close } for a Date, or null on a closed day.
export function hoursFor(date) {
  const h = OPEN_HOURS[date.getDay()];
  return h ? { open: h[0], close: h[1] } : null;
}

// The hour-long slots of an open day, by starting hour. [] when closed.
export function slotsFor(date) {
  const h = hoursFor(date);
  if (!h) return [];
  return Array.from({ length: h.close - h.open }, (_, i) => h.open + i);
}

// Which slot a (nearest-hour rounded) arrival belongs to. null when closed.
export function slotForHour(date, hour) {
  const h = hoursFor(date);
  if (!h) return null;
  return Math.min(Math.max(hour, h.open), h.close - 1);
}

// 15 -> "3 PM", 12 -> "12 PM", 10 -> "10 AM".
export function fmtHour(h) {
  const n = h % 12 === 0 ? 12 : h % 12;
  return `${n} ${h < 12 ? 'AM' : 'PM'}`;
}
