import { plainPreview, todayKey } from './taskBoard';

// Narrowing the board. All of it happens in memory: a center's board is a few
// dozen cards and it is already loaded, so a round trip per keystroke would buy
// nothing but latency.
//
// One shape drives both views. Whatever the board is showing, the list is
// showing, which is the whole reason a view switch is a switch and not a
// different page.

export const EMPTY_FILTERS = {
  q: '',
  assignee: 'anyone', // 'anyone' | 'mine' | 'center' | '<user id as string>'
  due: 'any',         // 'any' | 'overdue' | 'week' | 'none'
};

export const isFiltered = (f) =>
  Boolean(f.q.trim()) || f.assignee !== 'anyone' || f.due !== 'any';

// Seven days from today, as a calendar string. Compared as strings for the same
// reason dueMeta does: a pg DATE is YYYY-MM-DD, and putting it through Date()
// to add a week reads as the day before in any negative offset.
function weekFromToday(today) {
  const [y, m, d] = today.split('-').map(Number);
  const then = new Date(y, m - 1, d + 7);
  return `${then.getFullYear()}-${String(then.getMonth() + 1).padStart(2, '0')}-${String(then.getDate()).padStart(2, '0')}`;
}

function matchesDue(task, due, today) {
  if (due === 'any') return true;
  if (due === 'none') return !task.due_date;
  if (!task.due_date) return false;
  if (due === 'overdue') return task.due_date < today;
  return task.due_date <= weekFromToday(today); // 'week' includes what is already late
}

function matchesAssignee(task, assignee, userId) {
  if (assignee === 'anyone') return true;
  if (assignee === 'mine') return task.assignee_id === userId;
  if (assignee === 'center') return task.assignee_center === true;
  return String(task.assignee_id ?? '') === String(assignee);
}

// The search reads what a card SAYS, which for half this board is the body: the
// cards that came off the sticky wall have no title at all. Markdown is stripped
// first so a search for "invoice" is not defeated by "**invoice**".
function matchesText(task, q) {
  if (!q) return true;
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return `${task.title || ''} ${plainPreview(task.body)}`.toLowerCase().includes(needle);
}

export function filterTasks(tasks, filters, { userId } = {}) {
  if (!isFiltered(filters)) return tasks;
  const today = todayKey();
  return tasks.filter(
    (t) =>
      matchesText(t, filters.q) &&
      matchesAssignee(t, filters.assignee, userId) &&
      matchesDue(t, filters.due, today)
  );
}
