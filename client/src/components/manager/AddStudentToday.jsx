import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import Modal from '../ui/Modal';
import ProgramBadge from '../ui/ProgramBadge';
import BeltBadge from '../ui/BeltBadge';
import Button from '../ui/Button';
import { today } from '../../utils/dateUtils';

export default function AddStudentToday({ isOpen, onClose, onAdded, existingStudentIds = [] }) {
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
    // Load all students initially
    fetchStudents('');
  }, [isOpen]);

  async function fetchStudents(q) {
    setLoading(true);
    try {
      const data = await api.get(`/students?search=${encodeURIComponent(q)}`);
      setResults(data);
    } catch (err) {
      setError('Failed to load students');
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

  const handleAdd = async (student) => {
    setAdding(student.id);
    setError('');
    try {
      const assignment = await api.post('/daily', {
        student_id: student.id,
        session_date: today(),
      });
      onAdded && onAdded(assignment);
    } catch (err) {
      setError(err.message || 'Failed to add student');
    } finally {
      setAdding(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Student to Today's Board">
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
          autoFocus
        />

        {error && (
          <p className="text-ninja-red text-sm font-ninja">{error}</p>
        )}

        <div className="space-y-2 max-h-80 overflow-y-auto">
          {loading && (
            <p className="text-ninja-muted font-ninja text-center py-4">Searching...</p>
          )}
          {!loading && results.length === 0 && (
            <p className="text-ninja-muted font-ninja text-center py-4">No students found</p>
          )}
          {!loading && results.map((student) => {
            const alreadyAdded = existingStudentIds.includes(student.id);
            return (
              <div
                key={student.id}
                className="flex items-center justify-between bg-ninja-bg border border-ninja-border rounded-xl p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-ninja-navy font-ninja font-semibold truncate">{student.full_name}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <ProgramBadge program={student.program} size="xs" />
                    {student.program === 'CREATE' && student.belt_level && (
                      <BeltBadge belt={student.belt_level} sublevel={student.belt_sublevel} size="xs" />
                    )}
                  </div>
                </div>
                <Button
                  variant={alreadyAdded ? 'secondary' : 'primary'}
                  size="sm"
                  disabled={alreadyAdded || adding === student.id}
                  onClick={() => handleAdd(student)}
                >
                  {alreadyAdded ? 'Added' : adding === student.id ? '...' : 'Add'}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
