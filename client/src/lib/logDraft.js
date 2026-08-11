import { createProjectOptions } from '../utils/beltConfig';

// Reading a saved progress log back into the shape the log form's field rows
// hold, and writing that shape back out to the API. Both the form (editing the
// session it just wrote) and the history row's editor go through here, so a
// correction made in either place lands on the same columns.

// A value the curriculum doesn't carry — a custom project, a one-off module —
// opens in the free-text field rather than disappearing into a select that has
// no option to show it.
export function createEntryFromLog(log, { beltProjects } = {}) {
  const { options } = createProjectOptions({
    beltLevel: log.belt_level_at || '',
    beltSublevel: log.belt_sublevel_at ? String(log.belt_sublevel_at) : '',
    beltProjects,
  });
  const custom = !!log.project_at && !options.includes(log.project_at);
  return {
    project: custom ? '' : (log.project_at || ''),
    isCustom: custom,
    customProject: custom ? log.project_at : '',
    status: log.status_at || '',
  };
}

export function lessonEntryFromLog(log, curriculum = {}) {
  const modules = curriculum[log.sub_program || log.program] || [];
  const known = modules.find((m) => m.module === log.module_name);
  const lessonKnown = !log.lesson_name || (known?.lessons || []).includes(log.lesson_name);
  const standard = !!known && lessonKnown;
  return {
    subProgram: log.sub_program || '',
    moduleName: standard ? log.module_name : ((log.module_name || log.lesson_name) ? '__custom__' : ''),
    lessonName: standard ? (log.lesson_name || '') : '',
    customModule: standard ? '' : (log.module_name || ''),
    customLesson: standard ? '' : (log.lesson_name || ''),
    status: log.status_at || '',
  };
}

// Selecting a course or module invalidates what sat under it.
export function applyEntryChange(entry, field, value) {
  const next = { ...entry, [field]: value };
  if (field === 'subProgram') { next.moduleName = ''; next.lessonName = ''; next.customModule = ''; next.customLesson = ''; }
  if (field === 'moduleName') { next.lessonName = ''; next.customModule = ''; next.customLesson = ''; }
  return next;
}

// A CREATE log carries a belt snapshot and no curriculum path; every other
// program is the reverse — the same split the log form posts — so a log that
// moves between programs drops the fields that don't belong to it rather than
// leaving them behind as orphans.
export function logPayload({ program, sessionDate, notes, beltLevel, beltSublevel, entry }) {
  const isCreate = program === 'CREATE';
  const custom = entry.moduleName === '__custom__';
  return {
    program,
    session_date: sessionDate,
    notes: notes.trim(),
    status_at: entry.status || null,
    belt_level_at: isCreate ? (beltLevel || null) : null,
    belt_sublevel_at: isCreate && beltSublevel ? parseInt(beltSublevel) : null,
    project_at: isCreate ? (entry.isCustom ? (entry.customProject || null) : (entry.project || null)) : null,
    sub_program: isCreate ? null : (entry.subProgram || null),
    module_name: isCreate ? null : (custom ? (entry.customModule || null) : (entry.moduleName || null)),
    lesson_name: isCreate ? null : (custom ? (entry.customLesson || null) : (entry.lessonName || null)),
  };
}
