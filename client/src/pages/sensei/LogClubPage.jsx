import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import Button from '../../components/ui/Button';
import { api } from '../../api/client';
import { today } from '../../utils/dateUtils';

const CLUBS = ['3D Design Club', 'Minecraft Club', 'Roblox Club'];

export default function LogClubPage() {
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  const [clubName, setClubName] = useState('');
  const [sessionDate, setSessionDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/students')
      .then((data) => setStudents(data.filter((s) => s.active !== false)))
      .catch(() => setError('Could not load students'))
      .finally(() => setLoadingStudents(false));
  }, []);

  const toggleStudent = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = students.filter((s) =>
    s.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clubName) return setError('Please select a club.');
    if (selectedIds.size === 0) return setError('Please mark at least one student as present.');
    setError('');
    setSubmitting(true);
    try {
      await api.post('/clubs', {
        club_name: clubName,
        session_date: sessionDate,
        notes: notes.trim() || undefined,
        student_ids: [...selectedIds],
      });
      navigate(-1);
    } catch {
      setError('Failed to save club session. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-5">
        <button
          onClick={() => navigate(-1)}
          className="text-ninja-muted hover:text-ninja-blue font-ninja text-sm flex items-center gap-1 transition-colors"
        >
          ← Back
        </button>

        <div>
          <h1 className="text-2xl font-bold font-ninja text-ninja-navy">Log Club Session</h1>
          <p className="text-ninja-muted font-ninja text-sm mt-1">Record today's club and mark who showed up.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Club selector */}
          <div className="bg-white border border-ninja-border rounded-2xl p-5 shadow-sm">
            <p className="text-ninja-navy font-ninja font-bold mb-3">Which club?</p>
            <div className="flex flex-wrap gap-2">
              {CLUBS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setClubName(c)}
                  className={`px-4 py-2 rounded-xl font-ninja font-semibold text-sm border transition-colors ${
                    clubName === c
                      ? 'bg-ninja-blue text-white border-ninja-blue'
                      : 'bg-ninja-bg text-ninja-navy border-ninja-border hover:border-ninja-blue'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div className="bg-white border border-ninja-border rounded-2xl p-5 shadow-sm">
            <label className="text-ninja-navy font-ninja font-bold block mb-2">Session Date</label>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="bg-ninja-bg border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue"
            />
          </div>

          {/* Attendance */}
          <div className="bg-white border border-ninja-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-ninja-navy font-ninja font-bold">Who attended?</p>
              {selectedIds.size > 0 && (
                <span className="text-ninja-blue font-ninja font-bold text-sm">{selectedIds.size} selected</span>
              )}
            </div>
            <input
              type="text"
              placeholder="Search ninjas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-ninja-bg border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue mb-3"
            />
            {loadingStudents ? (
              <p className="text-ninja-muted font-ninja text-sm text-center py-4">Loading...</p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {filtered.map((s) => {
                  const checked = selectedIds.has(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleStudent(s.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        checked
                          ? 'bg-ninja-blue text-white'
                          : 'bg-ninja-bg text-ninja-navy hover:bg-blue-50'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                        checked ? 'bg-white border-white' : 'border-ninja-border bg-white'
                      }`}>
                        {checked && <span className="text-ninja-blue text-xs font-bold">✓</span>}
                      </div>
                      <span className="font-ninja font-semibold text-sm">{s.full_name}</span>
                    </button>
                  );
                })}
                {filtered.length === 0 && (
                  <p className="text-ninja-muted font-ninja text-sm text-center py-4">No students found.</p>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white border border-ninja-border rounded-2xl p-5 shadow-sm">
            <label className="text-ninja-navy font-ninja font-bold block mb-2">Session Notes <span className="text-ninja-muted font-normal">(optional)</span></label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did the session go? What did the group work on?"
              rows={4}
              className="w-full bg-ninja-bg border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue resize-none"
            />
          </div>

          {error && <p className="text-ninja-red font-ninja text-sm">{error}</p>}

          <Button type="submit" disabled={submitting} size="md" className="w-full">
            {submitting ? 'Saving...' : 'Save Club Session'}
          </Button>
        </form>
      </div>
    </Layout>
  );
}
