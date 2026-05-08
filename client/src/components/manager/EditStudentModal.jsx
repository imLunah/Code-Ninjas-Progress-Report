import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

export default function EditStudentModal({ isOpen, onClose, student, onSaved }) {
  const [form, setForm] = useState({ full_name: '', birthday: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (student) {
      setForm({
        full_name: student.full_name || '',
        birthday: student.birthday || '',
      });
      setError('');
    }
  }, [student, isOpen]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const updated = await api.patch(`/students/${student.id}`, {
        full_name: form.full_name,
        birthday: form.birthday || null,
      });
      onSaved && onSaved(updated);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update ninja');
    } finally {
      setLoading(false);
    }
  };

  if (!student) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Ninja">
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
