import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../components/layout/Layout';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function AccountPage() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState(user?.username || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  const PRESET_AVATARS = [
    { src: '/profile/ninja-wave.png',       label: 'Wave'       },
    { src: '/profile/ninja-coder.png',      label: 'Coder'      },
    { src: '/profile/ninja-coder-2.png',    label: 'Coder 2'    },
    { src: '/profile/ninja-gamer.png',      label: 'Gamer'      },
    { src: '/profile/ninja-hype.png',       label: 'Hype'       },
    { src: '/profile/ninja-kick.png',       label: 'Kick'       },
    { src: '/profile/ninja-controller.png', label: 'Controller' },
    { src: '/profile/ninja-run.png',        label: 'Run'        },
    { src: '/profile/ninja-hacker.png',     label: 'Hacker'     },
    { src: '/profile/ninja-rocket.png',     label: 'Rocket'     },
  ];

  const handlePresetSelect = async (src) => {
    setSavingAvatar(true);
    setAvatarError('');
    try {
      await api.patch('/users/me/avatar', { profile_pic_url: src });
      setUser((prev) => ({ ...prev, profilePicUrl: src }));
    } catch {
      setAvatarError('Failed to set avatar. Try again.');
    } finally {
      setSavingAvatar(false);
    }
  };

  const initials = user?.displayName?.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?';

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmedUsername = username.trim();
    const trimmedPassword = newPassword.trim();

    if (!trimmedUsername && !trimmedPassword) return setError('Enter a new username or password.');
    if (trimmedPassword && trimmedPassword !== confirmPassword.trim()) return setError('Passwords do not match.');
    if (trimmedPassword && (trimmedPassword.length < 6 || !/[A-Z]/.test(trimmedPassword) || !/[^A-Za-z0-9]/.test(trimmedPassword))) {
      return setError('Password must be at least 6 characters and include an uppercase letter and a special character.');
    }

    const payload = {};
    if (trimmedUsername && trimmedUsername !== user?.username) payload.username = trimmedUsername;
    if (trimmedPassword) {
      payload.new_password = trimmedPassword;
      payload.current_password = currentPassword.trim();
    }
    if (!Object.keys(payload).length) return setSuccess('No changes to save.');

    setSaving(true);
    try {
      await api.patch('/users/me', payload);
      if (payload.username) setUser((prev) => ({ ...prev, username: payload.username }));
      setCurrentPassword('');
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

        {/* Hero profile banner */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="relative bg-ninja-navy rounded-2xl overflow-hidden px-6 pt-7 pb-6 shadow-lg"
        >
          <img src="/CodeNinjasIcon.svg" alt="" className="absolute right-4 top-4 w-20 opacity-[0.08] pointer-events-none" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="relative flex-shrink-0">
              {user?.profilePicUrl ? (
                <img src={user.profilePicUrl} alt={user.displayName} className="w-16 h-16 rounded-full object-cover border-3 border-white/30 shadow-lg" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-ninja-blue border-2 border-white/20 flex items-center justify-center text-white font-ninja font-bold text-xl shadow-lg">
                  {initials}
                </div>
              )}
              {savingAvatar && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-ninja font-bold text-lg leading-tight truncate">{user?.displayName}</p>
              <p className="text-white/50 font-ninja text-xs mt-0.5 capitalize">{user?.role === 'manager' ? 'Center Director' : user?.role === 'admin' ? 'Admin' : 'Sensei'}</p>
              <p className="text-white/40 font-ninja text-xs">@{user?.username}</p>
            </div>
          </div>
          {avatarError && <p className="text-red-300 font-ninja text-xs mt-2 relative z-10">{avatarError}</p>}
        </motion.div>

        {/* Preset avatars */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.3 }}
          className="bg-white border border-ninja-border rounded-2xl p-5 shadow-sm"
        >
          <p className="text-ninja-muted font-ninja text-xs font-semibold uppercase tracking-wide mb-3">Choose Avatar</p>
          <div className="flex gap-3 flex-wrap">
            {PRESET_AVATARS.map(({ src, label }) => {
              const isActive = user?.profilePicUrl === src;
              return (
                <button
                  key={src}
                  type="button"
                  onClick={() => handlePresetSelect(src)}
                  disabled={savingAvatar}
                  className={`relative w-14 h-14 rounded-full overflow-hidden border-2 transition-all hover:scale-105 disabled:opacity-50 ${
                    isActive ? 'border-ninja-blue ring-2 ring-ninja-blue/30' : 'border-ninja-border hover:border-ninja-blue'
                  }`}
                  title={label}
                >
                  <img src={src} alt={label} className="w-full h-full object-cover bg-ninja-bg" />
                  {isActive && (
                    <div className="absolute inset-0 bg-ninja-blue/20 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">✓</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Username + Password */}
        <motion.form
          onSubmit={handleSave}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="bg-white border border-ninja-border rounded-2xl p-6 shadow-sm space-y-5"
        >
          <div>
            <label className="block text-ninja-muted text-xs font-ninja font-semibold uppercase tracking-wide mb-1.5">Username</label>
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
            {newPassword && (
              <div>
                <label className="block text-ninja-muted text-xs font-ninja mb-1.5">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Confirm your current password"
                  autoComplete="current-password"
                  className="w-full bg-ninja-bg border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue"
                />
              </div>
            )}
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
            className="w-full bg-ninja-blue text-white font-ninja font-bold text-sm py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </motion.form>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <button
            onClick={async () => { try { await logout(); } catch {} navigate('/login'); }}
            className="w-full border border-ninja-red text-ninja-red font-ninja font-semibold text-sm py-2.5 rounded-xl hover:bg-red-50 transition-colors"
          >
            Sign Out
          </button>
        </motion.div>
      </div>
    </Layout>
  );
}
