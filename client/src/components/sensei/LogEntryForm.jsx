import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { today, formatDate } from '../../utils/dateUtils';
import Button from '../ui/Button';
import LazyMarkdownEditor from '../shared/LazyMarkdownEditor';
import BeltProgressFields from './BeltProgressFields';
import { useCurriculum } from '../../context/CurriculumContext';
import { PROJECTS, STATUSES, BELT_LEVEL_PROJECTS, getLevelProjects } from '../../utils/beltConfig';

// Flat-project-list belts (no level / Build-Solve labels): Black capstone + bonus tracks.
const UPPER_BELTS = ['Black', 'Bronze', 'Silver', 'Platinum'];

const emptyCreateEntry = { project: '', status: '', isCustom: false, customProject: '' };
const emptyEntry = { subProgram: '', moduleName: '', lessonName: '', customModule: '', customLesson: '', status: '' };

// Stable row ids so React keys survive add/remove (index keys bleed row DOM state).
let _rowSeq = 0;
const rowUid = () => `row-${++_rowSeq}`;
const newLessonEntry = () => ({ ...emptyEntry, _uid: rowUid() });
const newCreateEntry = (init) => ({ ...emptyCreateEntry, ...init, _uid: rowUid() });

function getSectionLabel(index, total) {
  if (index === total - 1) return 'Adventure';
  const num = Math.floor(index / 2) + 1;
  return index % 2 === 0 ? `Build ${num}` : `Solve ${num}`;
}

function CreateProjectRow({ entry, index, total, beltLevel, beltSublevel, beltProjects, onChange, onRemove }) {
  const isUpperBelt = UPPER_BELTS.includes(beltLevel);
  const dynBelt = beltProjects?.[beltLevel];
  const dynLevel = dynBelt ? Object.fromEntries(
    Object.entries(dynBelt).map(([sub, projs]) => [sub, projs.map(p => p.project_name)])
  ) : null;
  const dynLevelProjects = dynLevel?.[beltSublevel] ?? null;
  const dynAllUpper = isUpperBelt && dynBelt ? Object.values(dynBelt).flat().map(p => p.project_name) : null;

  const levelProjects = dynLevelProjects ?? getLevelProjects(beltLevel, beltSublevel);
  const allUpperBeltProjects = dynAllUpper ?? (isUpperBelt && BELT_LEVEL_PROJECTS[beltLevel]
    ? Object.values(BELT_LEVEL_PROJECTS[beltLevel]).flat()
    : null);

  const projectOptions = isUpperBelt ? (allUpperBeltProjects ?? PROJECTS) : (levelProjects ?? PROJECTS);
  const hasBeltProjects = beltLevel && !!(dynBelt || BELT_LEVEL_PROJECTS[beltLevel]);
  const needsSublevel = !isUpperBelt && hasBeltProjects && (!beltSublevel || parseInt(beltSublevel) < 1);
  const showLabels = levelProjects && !isUpperBelt;

  return (
    <div className="relative border border-ninja-border rounded-xl p-4 bg-ninja-bg space-y-3">
      {total > 1 && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-ninja-muted font-ninja text-xs font-semibold uppercase tracking-wide">
            Project {index + 1}
          </span>
          <button
            type="button"
            onClick={onRemove}
            className="text-ninja-muted hover:text-red-400 transition-colors text-sm leading-none"
            title="Remove this project"
          >
            ✕
          </button>
        </div>
      )}

      <div>
        <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
          Project
        </label>
        {needsSublevel ? (
          <p className="text-ninja-muted font-ninja text-sm italic">Select a sublevel above to see projects.</p>
        ) : entry.isCustom ? (
          <div className="space-y-1.5">
            <input
              type="text"
              value={entry.customProject}
              onChange={(e) => onChange('customProject', e.target.value)}
              placeholder="Project name..."
              className="w-full bg-white border border-ninja-blue text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none transition-colors"
              autoFocus
            />
            <button
              type="button"
              onClick={() => { onChange('isCustom', false); onChange('customProject', ''); }}
              className="text-ninja-muted hover:text-ninja-navy text-xs font-ninja underline"
            >
              ← Use standard project
            </button>
          </div>
        ) : (
          <select
            value={entry.project}
            onChange={(e) => {
              if (e.target.value === '__custom__') {
                onChange('isCustom', true);
                onChange('project', '');
              } else {
                onChange('project', e.target.value);
              }
            }}
            className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
          >
            <option value="">Select project...</option>
            {projectOptions.map((p, i) => {
              const label = showLabels ? `${getSectionLabel(i, projectOptions.length)}: ${p}` : p;
              return <option key={p} value={p}>{label}</option>;
            })}
            <option value="__custom__">Custom...</option>
          </select>
        )}
      </div>

      <div>
        <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
          Status
        </label>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange('status', entry.status === s ? '' : s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-ninja font-semibold transition-colors ${
                entry.status === s
                  ? s === 'Completed' ? 'bg-emerald-500 text-white' : 'bg-ninja-blue text-white'
                  : 'bg-white border border-ninja-border text-ninja-navy hover:border-ninja-blue'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function LessonEntryRow({ entry, index, total, program, onChange, onRemove, subPrograms, curriculum: curriculumData }) {
  const subProgramOptions = subPrograms[program] || null;
  const curriculum = (entry.subProgram ? curriculumData[entry.subProgram] : curriculumData[program]) || [];
  const moduleOptions = curriculum;
  const isCustomModule = entry.moduleName === '__custom__';
  const lessonOptions = isCustomModule ? [] : (moduleOptions.find((m) => m.module === entry.moduleName)?.lessons || []);

  return (
    <div className="relative border border-ninja-border rounded-xl p-4 bg-ninja-bg space-y-3">
      {total > 1 && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-ninja-muted font-ninja text-xs font-semibold uppercase tracking-wide">
            Lesson {index + 1}
          </span>
          <button
            type="button"
            onClick={onRemove}
            className="text-ninja-muted hover:text-red-400 transition-colors text-sm leading-none"
            title="Remove this lesson"
          >
            ✕
          </button>
        </div>
      )}

      {subProgramOptions && (
        <div>
          <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
            Kit / Curriculum
          </label>
          <div className="flex flex-wrap gap-2">
            {subProgramOptions.map((sp) => (
              <button
                key={sp}
                type="button"
                onClick={() => onChange('subProgram', sp)}
                className={`px-3 py-1.5 rounded-lg text-sm font-ninja font-semibold transition-colors ${
                  entry.subProgram === sp
                    ? 'bg-ninja-blue text-white'
                    : 'bg-white border border-ninja-border text-ninja-navy hover:border-ninja-blue'
                }`}
              >
                {sp}
              </button>
            ))}
          </div>
        </div>
      )}

      {(entry.subProgram || !subProgramOptions) && moduleOptions.length > 0 && !isCustomModule && (
        <div>
          <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
            Module
          </label>
          <select
            value={entry.moduleName}
            onChange={(e) => onChange('moduleName', e.target.value)}
            className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
          >
            <option value="">Select module...</option>
            {moduleOptions.map((m) => (
              <option key={m.module} value={m.module}>{m.module}</option>
            ))}
            <option value="__custom__">Custom...</option>
          </select>
        </div>
      )}

      {isCustomModule && (
        <div className="space-y-3">
          <div>
            <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
              Custom Module
            </label>
            <input
              type="text"
              value={entry.customModule}
              onChange={(e) => onChange('customModule', e.target.value)}
              placeholder="e.g., Special Project, Guest Session..."
              className="w-full bg-white border border-ninja-blue text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
              Custom Lesson
            </label>
            <input
              type="text"
              value={entry.customLesson}
              onChange={(e) => onChange('customLesson', e.target.value)}
              placeholder="e.g., Intro to Python, Robot Challenge..."
              className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
            />
          </div>
          <button
            type="button"
            onClick={() => onChange('moduleName', '')}
            className="text-ninja-muted hover:text-ninja-navy text-xs font-ninja underline"
          >
            ← Back to curriculum
          </button>
        </div>
      )}

      {entry.moduleName && !isCustomModule && lessonOptions.length > 0 && (
        <div>
          <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
            Lesson
          </label>
          <select
            value={entry.lessonName}
            onChange={(e) => onChange('lessonName', e.target.value)}
            className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
          >
            <option value="">Select lesson...</option>
            {lessonOptions.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      )}

      {(entry.lessonName || (isCustomModule && (entry.customModule || entry.customLesson))) && (
        <div>
          <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
            Status
          </label>
          <div className="flex flex-wrap gap-2">
            {['Started', 'Working On', 'Completed'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onChange('status', entry.status === s ? '' : s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-ninja font-semibold transition-colors ${
                  entry.status === s
                    ? s === 'Completed'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-ninja-blue text-white'
                    : 'bg-white border border-ninja-border text-ninja-navy hover:border-ninja-blue'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LogEntryForm({ student, program, enrollment, onLogged, sessionDate: sessionDateProp }) {
  const { subPrograms, curriculum, beltProjects } = useCurriculum();
  const [notes, setNotes] = useState('');
  const [beltLevel, setBeltLevel] = useState(enrollment?.belt_level || '');
  const [beltSublevel, setBeltSublevel] = useState(enrollment?.belt_sublevel || '');

  const [createEntries, setCreateEntries] = useState([newCreateEntry({
    project: enrollment?.current_project || '',
    status: enrollment?.project_status || '',
  })]);

  const [lessonEntries, setLessonEntries] = useState([newLessonEntry()]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isCreate = program === 'CREATE';
  const sessionDate = sessionDateProp || today();
  const hasLessonFields = !!(subPrograms[program] || curriculum[program]?.length);

  useEffect(() => {
    setLessonEntries([newLessonEntry()]);
    setCreateEntries([newCreateEntry({
      project: enrollment?.current_project || '',
      status: enrollment?.project_status || '',
    })]);
    // A leftover success banner from the previous program would hide this form
    setSuccess(false);
    setError('');
  }, [program]);

  const updateEntry = (index, field, value) => {
    setLessonEntries((prev) =>
      prev.map((e, i) => {
        if (i !== index) return e;
        const updated = { ...e, [field]: value };
        if (field === 'subProgram') { updated.moduleName = ''; updated.lessonName = ''; updated.customModule = ''; updated.customLesson = ''; }
        if (field === 'moduleName') { updated.lessonName = ''; updated.customModule = ''; updated.customLesson = ''; }
        return updated;
      })
    );
  };

  const addEntry = () => setLessonEntries((prev) => [...prev, newLessonEntry()]);
  const removeEntry = (index) => setLessonEntries((prev) => prev.filter((_, i) => i !== index));

  const updateCreateEntry = (index, field, value) => {
    setCreateEntries((prev) => prev.map((e, i) => i !== index ? e : { ...e, [field]: value }));
  };
  const addCreateEntry = () => setCreateEntries((prev) => [...prev, newCreateEntry()]);
  const removeCreateEntry = (index) => setCreateEntries((prev) => prev.filter((_, i) => i !== index));

  const handleBeltClearProjects = () => {
    setCreateEntries((prev) => prev.map((e) => ({ ...e, project: '', isCustom: false, customProject: '' })));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!notes.trim()) {
      setError('Notes are required');
      return;
    }
    if (isCreate && !beltLevel) {
      setError('Belt level is required for CREATE logs');
      return;
    }
    if (loading) return;

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      let payload;

      if (isCreate) {
        const filledCreateEntries = createEntries
          .filter((e) => e.isCustom ? e.customProject : e.project)
          .map((e) => ({
            project_at: e.isCustom ? (e.customProject || null) : (e.project || null),
            status: e.status || null,
          }));
        const lastCE = filledCreateEntries[filledCreateEntries.length - 1];

        payload = {
          student_id: student.id,
          program,
          session_date: sessionDate,
          notes: notes.trim(),
          belt_level_at: beltLevel || null,
          belt_sublevel_at: beltSublevel ? parseInt(beltSublevel) : null,
          project_at: lastCE?.project_at || null,
          status_at: lastCE?.status || null,
          update_student: true,
          ...(filledCreateEntries.length > 1 ? { lesson_entries: filledCreateEntries } : {}),
        };
      } else {
        const filledEntries = lessonEntries
          .filter((e) => {
            if (e.moduleName === '__custom__') return e.customModule || e.customLesson;
            return e.moduleName || e.subProgram || e.lessonName;
          })
          .map((e) => ({
            sub_program: e.subProgram || null,
            module_name: e.moduleName === '__custom__' ? (e.customModule || null) : (e.moduleName || null),
            lesson_name: e.moduleName === '__custom__' ? (e.customLesson || null) : (e.lessonName || null),
            status: e.status || null,
          }));

        payload = {
          student_id: student.id,
          program,
          session_date: sessionDate,
          notes: notes.trim(),
          belt_level_at: null,
          belt_sublevel_at: null,
          project_at: null,
          status_at: filledEntries.length <= 1 ? (filledEntries[0]?.status || null) : null,
          update_student: true,
          ...(filledEntries.length > 1
            ? { lesson_entries: filledEntries }
            : {
                sub_program: filledEntries[0]?.sub_program || null,
                module_name: filledEntries[0]?.module_name || null,
                lesson_name: filledEntries[0]?.lesson_name || null,
              }),
        };
      }

      const log = await api.post('/progress', payload);
      setSuccess(true);
      setNotes('');
      setLessonEntries([newLessonEntry()]);
      setCreateEntries([newCreateEntry()]);
      onLogged && onLogged(log);
    } catch (err) {
      setError(err.message || 'Failed to save log');
    } finally {
      setLoading(false);
    }
  };

  const filledCreateCount = isCreate
    ? createEntries.filter((e) => e.isCustom ? e.customProject : e.project).length
    : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-ninja-red rounded-lg p-3 text-sm font-ninja">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm font-ninja flex items-center justify-between gap-3">
          <span>Progress logged successfully!</span>
          <button
            type="button"
            onClick={() => setSuccess(false)}
            className="text-green-700 border border-green-400 hover:bg-green-100 font-ninja font-semibold text-xs px-3 py-1 rounded-lg transition-colors whitespace-nowrap"
          >
            + Log Another
          </button>
        </div>
      )}

      {!success && (<>

      <div>
        <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
          Session Date
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={formatDate(sessionDate)}
            readOnly
            className="flex-1 bg-ninja-bg border border-ninja-border text-ninja-muted rounded-lg px-4 py-2 font-ninja cursor-not-allowed"
          />
          {sessionDate !== today() && (
            <span className="text-xs font-ninja text-ninja-blue bg-blue-50 border border-blue-200 px-2 py-1 rounded-lg whitespace-nowrap">
              Check-in date
            </span>
          )}
        </div>
      </div>

      {/* Multi-lesson entries for non-CREATE programs */}
      {!isCreate && hasLessonFields && (
        <div className="space-y-3">
          {lessonEntries.map((entry, i) => (
            <LessonEntryRow
              key={entry._uid}
              entry={entry}
              index={i}
              total={lessonEntries.length}
              program={program}
              onChange={(field, value) => updateEntry(i, field, value)}
              onRemove={() => removeEntry(i)}
              subPrograms={subPrograms}
              curriculum={curriculum}
            />
          ))}
          <button
            type="button"
            onClick={addEntry}
            className="w-full py-2 rounded-xl border-2 border-dashed border-ninja-border text-ninja-muted hover:border-ninja-blue hover:text-ninja-blue font-ninja font-semibold text-sm transition-colors"
          >
            + Add Another Lesson
          </button>
        </div>
      )}

      <div>
        <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
          Session Notes *
        </label>
        <LazyMarkdownEditor
          value={notes}
          onChange={setNotes}
          placeholder="What did the ninja work on today? Any breakthroughs or challenges?"
        />
      </div>

      {isCreate && (
        <div className="space-y-4 border-t border-ninja-border pt-4">
          <p className="text-ninja-muted font-ninja text-sm italic">Belt & project snapshot for this session:</p>

          <BeltProgressFields
            beltLevel={beltLevel}
            setBeltLevel={setBeltLevel}
            beltSublevel={beltSublevel}
            setBeltSublevel={setBeltSublevel}
            setProject={handleBeltClearProjects}
          />

          <div className="space-y-3">
            {createEntries.map((entry, i) => (
              <CreateProjectRow
                key={entry._uid}
                entry={entry}
                index={i}
                total={createEntries.length}
                beltLevel={beltLevel}
                beltSublevel={beltSublevel}
                beltProjects={beltProjects}
                onChange={(field, value) => updateCreateEntry(i, field, value)}
                onRemove={() => removeCreateEntry(i)}
              />
            ))}
            <button
              type="button"
              onClick={addCreateEntry}
              className="w-full py-2 rounded-xl border-2 border-dashed border-ninja-border text-ninja-muted hover:border-ninja-blue hover:text-ninja-blue font-ninja font-semibold text-sm transition-colors"
            >
              + Add Another Project
            </button>
          </div>
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Saving...' : filledCreateCount > 1
          ? `Log ${filledCreateCount} Projects`
          : lessonEntries.length > 1
          ? `Log ${lessonEntries.length} Lessons`
          : 'Log Progress'}
      </Button>

      </>)}
    </form>
  );
}
