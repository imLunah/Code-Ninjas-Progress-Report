import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import Modal from '../ui/Modal';
import ProgramBadge from '../ui/ProgramBadge';
import BeltBadge from '../ui/BeltBadge';
import Button from '../ui/Button';
import { today } from '../../utils/dateUtils';

export default function AddStudentToday({ isOpen, onClose, onAdded, existingEntries = [] }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setResults([]);
      setError('');
      return;
    }
    fetchStudents('');
  }, [isOpen]);

  async function fetchStudents(q) {
    setLoading(true);
    try {
      const { students: data } = await api.get(`/students?search=${encodeURIComponent(q)}`);
      setResults(data ?? []);
    } catch (err) {
      setError('Failed to load ninjas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const isEntryAdded = (studentId, program) =>
    existingEntries.some((e) => e.student_id === studentId && e.program === program);

  // A generic (no-class) check-in is stored with a null program.
  const isGenericAdded = (studentId) =>
    existingEntries.some((e) => e.student_id === studentId && !e.program);

  const handleAdd = async (student, program) => {
    const key = `${student.id}:${program}`;
    setAdding(key);
    setError('');
    try {
      const assignment = await api.post('/daily', {
        student_id: student.id,
        program,
        session_date: today(),
      });
      onAdded && onAdded(assignment);
    } catch (err) {
      setError(err.message || 'Failed to add ninja');
    } finally {
      setAdding(null);
    }
  };

  const searchBar = (
    <input
      type="text"
      placeholder="Search by name..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
    />
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Check In Ninja" subheader={searchBar}>
      <div className="space-y-3">
        {error && (
          <p className="text-ninja-red text-sm font-ninja">{error}</p>
        )}

        <div className="space-y-2">
          {loading && (
            <p className="text-ninja-muted font-ninja text-center py-4">Searching...</p>
          )}
          {!loading && results.length === 0 && (
            <p className="text-ninja-muted font-ninja text-center py-4">No ninjas found</p>
          )}
          {!loading && results.map((student) => {
            const allPrograms = student.programs || [];
            if (allPrograms.length === 0) return null;
            return (
              <div
                key={student.id}
                className="bg-ninja-bg border border-ninja-border rounded-xl p-3 space-y-2"
              >
                <p className="text-ninja-navy font-ninja font-semibold">{student.full_name}</p>
                {allPrograms.map((enrollment) => {
                  const added = isEntryAdded(student.id, enrollment.program);
                  const key = `${student.id}:${enrollment.program}`;
                  return (
                    <div key={enrollment.program} className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <ProgramBadge program={enrollment.program} size="xs" />
                        {enrollment.program === 'CREATE' && enrollment.belt_level && (
                          <BeltBadge belt={enrollment.belt_level} sublevel={enrollment.belt_sublevel} size="xs" />
                        )}
                      </div>
                      <Button
                        variant={added ? 'secondary' : 'primary'}
                        size="sm"
                        disabled={adding === key}
                        onClick={() => handleAdd(student, enrollment.program)}
                      >
                        {adding === key ? '...' : added ? 'Add Again' : 'Add'}
                      </Button>
                    </div>
                  );
                })}

                {/* Generic check-in — no class picked; the sensei chooses at log time */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-ninja-border">
                  <span className="text-ninja-muted font-ninja text-sm">
                    Not sure which class?
                  </span>
                  <Button
                    variant={isGenericAdded(student.id) ? 'secondary' : 'primary'}
                    size="sm"
                    disabled={adding === `${student.id}:null`}
                    onClick={() => handleAdd(student, null)}
                  >
                    {adding === `${student.id}:null`
                      ? '...'
                      : isGenericAdded(student.id) ? 'Add Again' : 'Check in'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
