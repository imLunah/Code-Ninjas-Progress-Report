import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { today, formatDate } from '../../utils/dateUtils';
import Button from '../ui/Button';
import BeltProgressFields from './BeltProgressFields';
import ProjectFields from './ProjectFields';
import { SUB_PROGRAMS, getCurriculum } from '../../utils/progressData';

function LessonEntryRow({ entry, index, total, program, onChange, onRemove }) {
  const subProgramOptions = SUB_PROGRAMS[program] || null;
  const curriculum = getCurriculum(program, entry.subProgram || null);
  const moduleOptions = curriculum || [];
  const lessonOptions = moduleOptions.find((m) => m.module === entry.moduleName)?.lessons || [];

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

      {(entry.subProgram || !subProgramOptions) && moduleOptions.length > 0 && (
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
          </select>
        </div>
      )}

      {entry.moduleName && lessonOptions.length > 0 && (
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
    </div>
  );
}

export default function LogEntryForm({ student, program, enrollment, onLogged, sessionDate: sessionDateProp }) {
  const [notes, setNotes] = useState('');
  const [beltLevel, setBeltLevel] = useState(enrollment?.belt_level || '');
  const [beltSublevel, setBeltSublevel] = useState(enrollment?.belt_sublevel || '');
  const [project, setProject] = useState(enrollment?.current_project || '');
  const [status, setStatus] = useState(enrollment?.project_status || '');

  const emptyEntry = { subProgram: '', moduleName: '', lessonName: '' };
  const [lessonEntries, setLessonEntries] = useState([{ ...emptyEntry }]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isCreate = program === 'CREATE';
  const sessionDate = sessionDateProp || today();
  const hasLessonFields = !!(SUB_PROGRAMS[program] || getCurriculum(program, null)?.length);

  // Reset lesson entries when program changes
  useEffect(() => {
    setLessonEntries([{ ...emptyEntry }]);
  }, [program]);

  const updateEntry = (index, field, value) => {
    setLessonEntries((prev) =>
      prev.map((e, i) => {
        if (i !== index) return e;
        const updated = { ...e, [field]: value };
        if (field === 'subProgram') { updated.moduleName = ''; updated.lessonName = ''; }
        if (field === 'moduleName') { updated.lessonName = ''; }
        return updated;
      })
    );
  };

  const addEntry = () => setLessonEntries((prev) => [...prev, { ...emptyEntry }]);
  const removeEntry = (index) => setLessonEntries((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!notes.trim()) {
      setError('Notes are required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Build lesson_entries — only include entries that have at least a module selected
      const filledEntries = lessonEntries
        .filter((e) => e.moduleName || e.subProgram || e.lessonName)
        .map((e) => ({
          sub_program: e.subProgram || null,
          module_name: e.moduleName || null,
          lesson_name: e.lessonName || null,
        }));

      const payload = {
        student_id: student.id,
        program,
        session_date: sessionDate,
        notes: notes.trim(),
        belt_level_at: isCreate ? (beltLevel || null) : null,
        belt_sublevel_at: isCreate && beltSublevel ? parseInt(beltSublevel) : null,
        project_at: isCreate ? (project || null) : null,
        status_at: isCreate ? (status || null) : null,
        update_student: true,
        // Use lesson_entries array if multiple; fall back to single-lesson fields
        ...(filledEntries.length > 1
          ? { lesson_entries: filledEntries }
          : {
              sub_program: filledEntries[0]?.sub_program || null,
              module_name: filledEntries[0]?.module_name || null,
              lesson_name: filledEntries[0]?.lesson_name || null,
            }),
      };

      const log = await api.post('/progress', payload);
      setSuccess(true);
      setNotes('');
      setLessonEntries([{ ...emptyEntry }]);
      setProject(enrollment?.current_project || '');
      setStatus(enrollment?.project_status || '');
      onLogged && onLogged(log);
    } catch (err) {
      setError(err.message || 'Failed to save log');
    } finally {
      setLoading(false);
    }
  };

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
              key={i}
              entry={entry}
              index={i}
              total={lessonEntries.length}
              program={program}
              onChange={(field, value) => updateEntry(i, field, value)}
              onRemove={() => removeEntry(i)}
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
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What did the ninja work on today? Any breakthroughs or challenges?"
          rows={4}
          className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors resize-none"
          required
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
            setProject={setProject}
          />

          <ProjectFields
            project={project}
            setProject={setProject}
            status={status}
            setStatus={setStatus}
            beltLevel={beltLevel}
            beltSublevel={beltSublevel}
          />
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Saving...' : `Log ${lessonEntries.length > 1 ? `${lessonEntries.length} Lessons` : 'Progress'}`}
      </Button>

      </>)}
    </form>
  );
}
