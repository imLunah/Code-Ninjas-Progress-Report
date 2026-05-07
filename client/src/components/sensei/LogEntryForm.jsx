import { useState } from 'react';
import { api } from '../../api/client';
import { today } from '../../utils/dateUtils';
import Button from '../ui/Button';
import BeltProgressFields from './BeltProgressFields';
import ProjectFields from './ProjectFields';

export default function LogEntryForm({ student, onLogged }) {
  const [notes, setNotes] = useState('');
  const [beltLevel, setBeltLevel] = useState(student?.belt_level || '');
  const [beltSublevel, setBeltSublevel] = useState(student?.belt_sublevel || '');
  const [project, setProject] = useState(student?.current_project || '');
  const [status, setStatus] = useState(student?.project_status || '');
  const [updateStudent, setUpdateStudent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isCreate = student?.program === 'CREATE';
  const sessionDate = today();

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
        session_date: sessionDate,
        notes: notes.trim(),
        belt_level_at: isCreate ? (beltLevel || null) : null,
        belt_sublevel_at: isCreate && beltSublevel ? parseInt(beltSublevel) : null,
        project_at: isCreate ? (project || null) : null,
        status_at: isCreate ? (status || null) : null,
        update_student: updateStudent,
      };

      const log = await api.post('/progress', payload);
      setSuccess(true);
      setNotes('');
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

      {/* Date (readonly) */}
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

      {/* Notes */}
      <div>
        <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
          Session Notes *
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What did the student work on today? Any breakthroughs or challenges?"
          rows={4}
          className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors resize-none"
          required
        />
      </div>

      {/* CREATE-specific fields */}
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

          {/* Update student checkbox */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={updateStudent}
              onChange={(e) => setUpdateStudent(e.target.checked)}
              className="w-4 h-4 accent-ninja-blue"
            />
            <span className="text-ninja-navy font-ninja text-sm">
              Update student profile with these values
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
