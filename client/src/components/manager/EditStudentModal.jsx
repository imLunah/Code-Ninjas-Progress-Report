import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { BELTS, PROJECTS, STATUSES, getMaxLevel } from '../../utils/beltConfig';

export default function EditStudentModal({ isOpen, onClose, student, onSaved }) {
  const [form, setForm] = useState({
    full_name: '',
    birthday: '',
    belt_level: '',
    belt_sublevel: '',
    current_project: '',
    project_status: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (student) {
      setForm({
        full_name: student.full_name || '',
        birthday: student.birthday || '',
        belt_level: student.belt_level || '',
        belt_sublevel: student.belt_sublevel || '',
        current_project: student.current_project || '',
        project_status: student.project_status || '',
      });
      setError('');
    }
  }, [student, isOpen]);

  const maxLevel = getMaxLevel(form.belt_level);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        full_name: form.full_name,
        birthday: form.birthday || null,
        belt_level: form.belt_level || null,
        belt_sublevel: form.belt_sublevel ? parseInt(form.belt_sublevel) : null,
        current_project: form.current_project || null,
        project_status: form.project_status || null,
      };
      const updated = await api.patch(`/students/${student.id}`, payload);
      onSaved && onSaved(updated);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update student');
    } finally {
      setLoading(false);
    }
  };

  if (!student) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Student">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-ninja-red rounded-lg p-3 text-sm font-ninja">
            {error}
          </div>
        )}

        <div>
          <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
            Full Name
          </label>
          <input
            type="text"
            name="full_name"
            value={form.full_name}
            onChange={handleChange}
            className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
            required
          />
        </div>

        <div>
          <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
            Birthday
          </label>
          <input
            type="date"
            name="birthday"
            value={form.birthday}
            onChange={handleChange}
            className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
          />
        </div>

        {student.program === 'CREATE' && (
          <>
            <div>
              <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
                Belt Level
              </label>
              <select
                name="belt_level"
                value={form.belt_level}
                onChange={handleChange}
                className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
              >
                <option value="">None</option>
                {BELTS.map((b) => (
                  <option key={b.name} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>

            {maxLevel && (
              <div>
                <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
                  Sublevel (1–{maxLevel})
                </label>
                <input
                  type="number"
                  name="belt_sublevel"
                  value={form.belt_sublevel}
                  onChange={handleChange}
                  min={1}
                  max={maxLevel}
                  className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
                Current Project
              </label>
              <select
                name="current_project"
                value={form.current_project}
                onChange={handleChange}
                className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
              >
                <option value="">None</option>
                {PROJECTS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
                Project Status
              </label>
              <select
                name="project_status"
                value={form.project_status}
                onChange={handleChange}
                className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
              >
                <option value="">None</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
