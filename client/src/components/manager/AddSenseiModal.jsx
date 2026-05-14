import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { api } from '../../api/client';

export default function AddSenseiModal({ isOpen, onClose, onAdded }) {
  const [form, setForm] = useState({ display_name: '', username: '', password: '' });
  const [role, setRole] = useState('sensei');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleClose = () => {
    setForm({ display_name: '', username: '', password: '' });
    setRole('sensei');
    setError('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const rawName = form.display_name.trim();
      const display_name = role === 'sensei' && !rawName.toLowerCase().startsWith('sensei ')
        ? `Sensei ${rawName}`
        : rawName;

      const created = await api.post('/users', {
        display_name,
        username: form.username,
        password: form.password,
        role,
      });
      onAdded && onAdded(created);
      handleClose();
    } catch (err) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Staff">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-ninja-red rounded-lg p-3 text-sm font-ninja">
            {error}
          </div>
        )}

        {/* Role toggle */}
        <div>
          <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-2 uppercase tracking-wide">
            Role
          </label>
          <div className="flex gap-2">
            {[
              { value: 'sensei', label: 'Sensei' },
              { value: 'manager', label: 'Center Director' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRole(opt.value)}
                className={`flex-1 py-2 rounded-lg text-sm font-ninja font-semibold transition-colors border ${
                  role === opt.value
                    ? 'bg-ninja-blue text-white border-ninja-blue'
                    : 'bg-white border-ninja-border text-ninja-navy hover:border-ninja-blue'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {role === 'manager' && (
            <p className="text-ninja-muted font-ninja text-xs mt-1.5">
              Center Directors have full access — student management, staff, and settings.
            </p>
          )}
        </div>

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
            placeholder={role === 'sensei' ? 'e.g. Alex Kim → saved as Sensei Alex Kim' : 'e.g. Jordan Smith'}
            className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
          />
          {role === 'sensei' && form.display_name.trim() && !form.display_name.trim().toLowerCase().startsWith('sensei ') && (
            <p className="text-ninja-muted font-ninja text-xs mt-1">
              Will be saved as <span className="font-semibold text-ninja-navy">Sensei {form.display_name.trim()}</span>
            </p>
          )}
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
            placeholder={role === 'manager' ? 'e.g. director_kim' : 'e.g. sensei_alex'}
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
            {loading ? 'Creating...' : `Add ${role === 'manager' ? 'Center Director' : 'Sensei'}`}
          </Button>
          <Button variant="secondary" type="button" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
