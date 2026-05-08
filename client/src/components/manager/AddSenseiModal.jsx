import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { api } from '../../api/client';

export default function AddSenseiModal({ isOpen, onClose, onAdded }) {
  const [form, setForm] = useState({ display_name: '', username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleClose = () => {
    setForm({ display_name: '', username: '', password: '' });
    setError('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const created = await api.post('/users', {
        display_name: form.display_name,
        username: form.username,
        password: form.password,
        role: 'sensei',
      });
      onAdded && onAdded(created);
      handleClose();
    } catch (err) {
      setError(err.message || 'Failed to create sensei');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Sensei">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-ninja-red rounded-lg p-3 text-sm font-ninja">
            {error}
          </div>
        )}

        <div>
          <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
            Display Name
          </label>
          <input
            type="text"
            name="display_name"
            value={form.display_name}
            onChange={handleChange}
            required
            placeholder="e.g. Alex Kim"
            className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
          />
        </div>

        <div>
          <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
            Username
          </label>
          <input
            type="text"
            name="username"
            value={form.username}
            onChange={handleChange}
            required
            placeholder="e.g. sensei_alex"
            className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
          />
        </div>

        <div>
          <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
            Password
          </label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            placeholder="Set a password"
            className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Creating...' : 'Create Sensei'}
          </Button>
          <Button variant="secondary" type="button" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
