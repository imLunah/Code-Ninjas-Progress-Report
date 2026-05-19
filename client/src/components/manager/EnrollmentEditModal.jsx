import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { BELTS, PROJECTS, STATUSES, getMaxLevel } from '../../utils/beltConfig';

const UPPER_BELTS = ['Purple', 'Brown', 'Red', 'Black'];

export default function EnrollmentEditModal({ isOpen, onClose, studentId, enrollment, onSaved }) {
  const [form, setForm] = useState({
    belt_level: '',
    belt_sublevel: '',
    current_project: '',
    project_status: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (enrollment) {
      setForm({
        belt_level: enrollment.belt_level || '',
        belt_sublevel: enrollment.belt_sublevel || '',
        current_project: enrollment.current_project || '',
        project_status: enrollment.project_status || '',
      });
      setError('');
    }
  }, [enrollment, isOpen]);

  const maxLevel = getMaxLevel(form.belt_level);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'belt_level') next.belt_sublevel = '';
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const updated = await api.patch(
        `/students/${studentId}/programs/${encodeURIComponent(enrollment.program)}`,
        {
          belt_level: form.belt_level || null,
          belt_sublevel: form.belt_sublevel ? parseInt(form.belt_sublevel) : null,
          current_project: form.current_project || null,
          project_status: form.project_status || null,
        }
      );
      onSaved && onSaved(updated);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update enrollment');
    } finally {
      setLoading(false);
    }
  };

  if (!enrollment) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit ${enrollment.program} Enrollment`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-ninja-red rounded-lg p-3 text-sm font-ninja">
            {error}
          </div>
        )}

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

        {maxLevel && !UPPER_BELTS.includes(form.belt_level) && (
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
