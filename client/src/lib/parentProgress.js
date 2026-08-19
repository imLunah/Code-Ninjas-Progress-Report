// Turning a child's raw records into what the parent portal shows.
//
// Everything here is derived from data the portal already receives: the
// student's enrolments (belt, sublevel, current project) and the progress log
// (belt_level_at, belt_sublevel_at, project_at, status_at per session). Nothing
// is stored twice. Where a fact is not recorded, the helper says so with a
// null rather than inventing one.

import { BELTS, BELT_LEVEL_PROJECTS, UPPER_BELTS, getLevels } from '../utils/beltConfig';

export const beltIndex = (name) => BELTS.findIndex((b) => b.name === name);

// A session log entry counts as a real session unless it was the roadmap's
// bulk mark-complete, which the server flags for exactly this reason.
export const realSessions = (logs) => (logs || []).filter((l) => !l.from_roadmap);

// The child's journey through CREATE, one entry per belt they have touched:
// when it started (first log at that belt), how many sessions, and whether it
// is behind them, current, or ahead. Belts with no logs and below the current
// belt are still "earned" (the child arrived at the current belt somehow), but
// with no dates, and the UI must not pretend otherwise.
export function beltJourney(enrollment, logs) {
  const current = enrollment?.belt_level || null;
  const currentIdx = beltIndex(current);
  const perBelt = new Map();
  for (const l of realSessions(logs)) {
    if (!l.belt_level_at) continue;
    const e = perBelt.get(l.belt_level_at) || { sessions: 0, first: null, last: null };
    e.sessions += 1;
    const d = String(l.session_date).split('T')[0];
    if (!e.first || d < e.first) e.first = d;
    if (!e.last || d > e.last) e.last = d;
    perBelt.set(l.belt_level_at, e);
  }
  return BELTS.map((b, i) => {
    const stats = perBelt.get(b.name) || { sessions: 0, first: null, last: null };
    let state = 'ahead';
    if (currentIdx >= 0 && i < currentIdx) state = 'earned';
    if (i === currentIdx) state = 'current';
    return { ...b, index: i, state, ...stats, levels: getLevels(b.name).length };
  });
}

// The projects of one level of one belt, each with the best status the log has
// for it. A project the log never mentions is 'todo'. The order is the
// curriculum's; the last entry of a level is its Adventure.
export function levelProjects(beltName, level, logs) {
  const names = (BELT_LEVEL_PROJECTS[beltName] || {})[level] || [];
  const byProject = new Map();
  for (const l of realSessions(logs)) {
    if (l.belt_level_at !== beltName) continue;
    if (Number(l.belt_sublevel_at) !== Number(level)) continue;
    if (!l.project_at) continue;
    const prev = byProject.get(l.project_at);
    const rank = { Completed: 3, 'Working On': 2, Started: 1 }[l.status_at] || 0;
    if (!prev || rank > prev.rank || (rank === prev.rank && String(l.session_date) > String(prev.date))) {
      byProject.set(l.project_at, { rank, status: l.status_at, date: String(l.session_date).split('T')[0] });
    }
  }
  // Black and the bonus tracks are flat lists of projects, with no
  // Build / Solve / Adventure rhythm to name.
  const flat = UPPER_BELTS.includes(beltName);
  return names.map((name, i) => {
    const hit = byProject.get(name);
    return {
      name,
      kind: flat ? 'Project' : i === names.length - 1 ? 'Adventure' : (/debug/i.test(name) ? 'Solve' : 'Build'),
      status: hit ? (hit.status === 'Completed' ? 'done' : 'working') : 'todo',
      date: hit?.date || null,
    };
  });
}

// Which levels of a belt are behind, current, ahead, given the enrolment.
export function levelStates(beltName, currentLevel) {
  const levels = getLevels(beltName);
  const cur = Number(currentLevel);
  return levels.map((lv) => ({
    level: lv,
    state: lv < cur ? 'done' : lv === cur ? 'current' : 'ahead',
    projectCount: ((BELT_LEVEL_PROJECTS[beltName] || {})[lv] || []).length,
  }));
}

// A short name for a level, taken from its Adventure project ("Creating with
// Index and While Loops!" → "Index and while loops"). Display only; the
// curriculum does not name levels.
export function levelTitle(beltName, level) {
  const names = (BELT_LEVEL_PROJECTS[beltName] || {})[level] || [];
  const adv = names[names.length - 1] || '';
  const m = adv.match(/^Creating with (.+?)!?$/i);
  if (m) {
    const t = m[1].trim();
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
  }
  if (/belt-up/i.test(adv)) return 'Belt-up project';
  return `Level ${level}`;
}

// Merge sessions and club attendance into one newest-first feed.
export function activityFeed(detail) {
  const logs = realSessions(detail?.session_logs).map((l) => ({ ...l, _type: 'session' }));
  const clubs = (detail?.club_attendance || []).map((c) => ({ ...c, _type: 'club', session_date: c.session_date }));
  return [...logs, ...clubs].sort((a, b) => String(b.session_date).localeCompare(String(a.session_date)));
}

export function fmtDay(dateStr) {
  if (!dateStr) return '';
  const d = new Date(String(dateStr).split('T')[0] + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function fmtLongDay(dateStr) {
  if (!dateStr) return '';
  const d = new Date(String(dateStr).split('T')[0] + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function calcAge(birthday) {
  if (!birthday) return null;
  const dob = new Date(String(birthday).split('T')[0] + 'T00:00:00');
  if (Number.isNaN(dob.getTime())) return null;
  return Math.floor((Date.now() - dob) / (365.25 * 24 * 60 * 60 * 1000));
}
