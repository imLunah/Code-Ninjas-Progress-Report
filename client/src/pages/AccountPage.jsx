import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function AccountPage() {
  const { user, setUser } = useAuth();

  const [username, setUsername] = useState(user?.username || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmedUsername = username.trim();
    const trimmedPassword = newPassword.trim();

    if (!trimmedUsername && !trimmedPassword) {
      return setError('Enter a new username or password.');
    }
    if (trimmedPassword && trimmedPassword !== confirmPassword.trim()) {
      return setError('Passwords do not match.');
    }
    if (trimmedPassword && trimmedPassword.length < 6) {
      return setError('Password must be at least 6 characters.');
    }

    setSaving(true);
    try {
      const payload = {};
      if (trimmedUsername && trimmedUsername !== user?.username) payload.username = trimmedUsername;
      if (trimmedPassword) payload.new_password = trimmedPassword;

      if (Object.keys(payload).length === 0) {
        setSuccess('No changes to save.');
        return;
      }

      const result = await api.patch('/users/me', payload);
      if (payload.username) {
        setUser((prev) => ({ ...prev, username: payload.username }));
      }
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Account updated successfully.');
    } catch (err) {
      setError(err?.message || 'Failed to update account.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-ninja text-ninja-navy">Account Settings</h1>
          <p className="text-ninja-muted font-ninja text-sm mt-1">
            Update your login username or password.
          </p>
        </div>

        <form onSubmit={handleSave} className="bg-white border border-ninja-border rounded-2xl p-6 shadow-sm space-y-5">
          {/* Username */}
          <div>
            <label className="block text-ninja-muted text-xs font-ninja font-semibold uppercase tracking-wide mb-1.5">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full bg-ninja-bg border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue"
            />
          </div>

          <div className="border-t border-ninja-border pt-5 space-y-4">
            <p className="text-ninja-muted font-ninja text-xs font-semibold uppercase tracking-wide">Change Password</p>

            <div>
              <label className="block text-ninja-muted text-xs font-ninja mb-1.5">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep current"
                autoComplete="new-password"
                className="w-full bg-ninja-bg border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue"
              />
            </div>

            <div>
              <label className="block text-ninja-muted text-xs font-ninja mb-1.5">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full bg-ninja-bg border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue"
              />
            </div>
          </div>

          {error && <p className="text-ninja-red font-ninja text-sm">{error}</p>}
          {success && <p className="text-green-600 font-ninja text-sm">{success}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-ninja-blue text-white font-ninja font-bold text-sm py-2.5 rounded-xl hover:bg-ninja-blue-hover transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </Layout>
  );
}
