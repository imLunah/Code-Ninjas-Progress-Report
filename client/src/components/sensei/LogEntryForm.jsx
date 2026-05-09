import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { today } from '../../utils/dateUtils';
import Button from '../ui/Button';
import BeltProgressFields from './BeltProgressFields';
import ProjectFields from './ProjectFields';
import { SUB_PROGRAMS, getCurriculum } from '../../utils/progressData';

export default function LogEntryForm({ student, program, enrollment, onLogged }) {
  const [notes, setNotes] = useState('');
  const [beltLevel, setBeltLevel] = useState(enrollment?.belt_level || '');
  const [beltSublevel, setBeltSublevel] = useState(enrollment?.belt_sublevel || '');
  const [project, setProject] = useState(enrollment?.current_project || '');
  const [status, setStatus] = useState(enrollment?.project_status || '');
  const [updateStudent, setUpdateStudent] = useState(false);

  const [subProgram, setSubProgram] = useState('');
  const [moduleName, setModuleName] = useState('');
  const [lessonName, setLessonName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isCreate = program === 'CREATE';
  const sessionDate = today();
  const subProgramOptions = SUB_PROGRAMS[program] || null;

  // Reset sub-program/module/lesson when program changes
  useEffect(() => {
    setSubProgram('');
    setModuleName('');
    setLessonName('');
  }, [program]);

  // Reset module/lesson when sub-program changes
  useEffect(() => {
    setModuleName('');
    setLessonName('');
  }, [subProgram]);

  // Reset lesson when module changes
  useEffect(() => {
    setLessonName('');
  }, [moduleName]);

  const curriculum = getCurriculum(program, subProgram || null);
  const moduleOptions = curriculum || [];
  const lessonOptions = moduleOptions.find((m) => m.module === moduleName)?.lessons || [];

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
      const payload = {
        student_id: student.id,
        program,
        session_date: sessionDate,
        notes: notes.trim(),
        belt_level_at: isCreate ? (beltLevel || null) : null,
        belt_sublevel_at: isCreate && beltSublevel ? parseInt(beltSublevel) : null,
        project_at: isCreate ? (project || null) : null,
        status_at: isCreate ? (status || null) : null,
        update_student: updateStudent,
        sub_program: subProgram || null,
        module_name: moduleName || null,
        lesson_name: lessonName || null,
      };

      const log = await api.post('/progress', payload);
      setSuccess(true);
      setNotes('');
      setSubProgram('');
      setModuleName('');
      setLessonName('');
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
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm font-ninja">
          Progress logged successfully!
        </div>
      )}

      <div>
        <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
          Session Date
        </label>
        <input
          type="text"
          value={sessionDate}
          readOnly
          className="w-full bg-ninja-bg border border-ninja-border text-ninja-muted rounded-lg px-4 py-2 font-ninja cursor-not-allowed"
        />
      </div>

      {/* Sub-program selector for Robotics Academy and JR */}
      {subProgramOptions && (
        <div className="space-y-3 border border-ninja-border rounded-xl p-4 bg-ninja-bg">
          <div>
            <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
              Kit / Curriculum
            </label>
            <div className="flex flex-wrap gap-2">
              {subProgramOptions.map((sp) => (
                <button
                  key={sp}
                  type="button"
                  onClick={() => setSubProgram(sp)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-ninja font-semibold transition-colors ${
                    subProgram === sp
                      ? 'bg-ninja-blue text-white'
                      : 'bg-white border border-ninja-border text-ninja-navy hover:border-ninja-blue'
                  }`}
                >
                  {sp}
                </button>
              ))}
            </div>
          </div>

          {subProgram && moduleOptions.length > 0 && (
            <div>
              <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
                Module
              </label>
              <select
                value={moduleName}
                onChange={(e) => setModuleName(e.target.value)}
                className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
              >
                <option value="">Select module...</option>
                {moduleOptions.map((m) => (
                  <option key={m.module} value={m.module}>{m.module}</option>
                ))}
              </select>
            </div>
          )}

          {moduleName && lessonOptions.length > 0 && (
            <div>
              <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
                Lesson
              </label>
              <select
                value={lessonName}
                onChange={(e) => setLessonName(e.target.value)}
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
      )}

      {/* Module/lesson for AI Academy (no sub-program) */}
      {!subProgramOptions && moduleOptions.length > 0 && (
        <div className="space-y-3 border border-ninja-border rounded-xl p-4 bg-ninja-bg">
          <div>
            <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
              Module
            </label>
            <select
              value={moduleName}
              onChange={(e) => setModuleName(e.target.value)}
              className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
            >
              <option value="">Select module...</option>
              {moduleOptions.map((m) => (
                <option key={m.module} value={m.module}>{m.module}</option>
              ))}
            </select>
          </div>

          {moduleName && lessonOptions.length > 0 && (
            <div>
              <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
                Lesson
              </label>
              <select
                value={lessonName}
                onChange={(e) => setLessonName(e.target.value)}
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
          />

          <ProjectFields
            project={project}
            setProject={setProject}
            status={status}
            setStatus={setStatus}
          />

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={updateStudent}
              onChange={(e) => setUpdateStudent(e.target.checked)}
              className="w-4 h-4 accent-ninja-blue"
            />
            <span className="text-ninja-navy font-ninja text-sm">
              Update ninja profile with these values
            </span>
          </label>
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Saving...' : 'Log Progress'}
      </Button>
    </form>
  );
}
