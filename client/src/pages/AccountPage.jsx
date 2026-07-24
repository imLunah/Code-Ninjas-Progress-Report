import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/layout/Layout';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ONBOARDING_ENABLED } from '../lib/features';
import { PRESET_AVATARS } from '../lib/avatars';

export default function AccountPage() {
  const { user, setUser, logout, switchLocation } = useAuth();
  const { dark, toggle, experimental, setExperimental } = useTheme();
  const navigate = useNavigate();

  const [username, setUsername] = useState(user?.username || '');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');

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

  const isForced = !!user?.mustResetPassword;

  const dashPath = user?.role === 'sensei' ? '/sensei/dashboard'
    : user?.role === 'admin' ? '/admin/locations'
    : '/manager/dashboard';

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmedUsername = username.trim();
    const trimmedPassword = newPassword.trim();
    const trimmedDisplay = displayName.trim();

    if (isForced) {
      if (!trimmedPassword) return setError('You must set a new password to continue.');
    } else {
      if (!trimmedUsername && !trimmedPassword && !trimmedDisplay) return setError('Enter a new display name, username, or password.');
      if (!trimmedDisplay) return setError('Display name cannot be empty.');
    }
    if (trimmedPassword && trimmedPassword !== confirmPassword.trim()) return setError('Passwords do not match.');
    if (trimmedPassword && (trimmedPassword.length < 6 || !/[A-Z]/.test(trimmedPassword) || !/[^A-Za-z0-9]/.test(trimmedPassword))) {
      return setError('Password must be at least 6 characters and include an uppercase letter and a special character.');
    }

    const payload = {};
    if (!isForced && trimmedUsername && trimmedUsername !== user?.username) payload.username = trimmedUsername;
    if (!isForced && trimmedDisplay && trimmedDisplay !== user?.displayName) payload.display_name = trimmedDisplay;
    if (trimmedPassword) {
      payload.new_password = trimmedPassword;
      if (!isForced) payload.current_password = currentPassword.trim();
    }
    if (!Object.keys(payload).length) return setSuccess('No changes to save.');

    setSaving(true);
    try {
      await api.patch('/users/me', payload);
      if (payload.username) setUser((prev) => ({ ...prev, username: payload.username }));
      if (payload.display_name) setUser((prev) => ({ ...prev, displayName: payload.display_name }));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (isForced) {
        setUser((prev) => ({ ...prev, mustResetPassword: false }));
        navigate(dashPath);
      } else {
        setSuccess('Account updated successfully.');
      }
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
          className="relative bg-[#dbe4f2] dark:bg-ninja-hero rounded-2xl overflow-hidden px-6 pt-7 pb-6 shadow-lg"
        >
          <img src="/CodeNinjasIcon.svg" alt="" className="absolute right-4 top-4 w-20 opacity-[0.08] pointer-events-none" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="relative flex-shrink-0">
              {user?.profilePicUrl ? (
                <img src={user.profilePicUrl} alt={user.displayName} className="w-16 h-16 rounded-full object-cover border-3 border-ninja-navy/15 dark:border-white/30 shadow-lg" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-ninja-blue border-2 border-ninja-navy/15 dark:border-white/20 flex items-center justify-center text-white font-ninja font-bold text-xl shadow-lg">
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
              <p className="text-ninja-navy font-ninja font-bold text-lg leading-tight truncate">{user?.displayName}</p>
              <p className="text-ninja-muted font-ninja text-xs mt-0.5 capitalize">{user?.role === 'manager' ? 'Center Director' : user?.role === 'admin' ? 'Admin' : 'Sensei'}</p>
              <p className="text-ninja-muted/70 font-ninja text-xs">@{user?.username}</p>
            </div>
          </div>
          {avatarError && <p className="text-ninja-red dark:text-red-300 font-ninja text-xs mt-2 relative z-10">{avatarError}</p>}
        </motion.div>

        {/* Forced reset banner */}
        {isForced && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3"
          >
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <p className="text-amber-800 font-ninja font-semibold text-sm">Password reset required</p>
              <p className="text-amber-700 font-ninja text-xs mt-0.5">Your password was reset by an admin. Set a new password to continue.</p>
            </div>
          </motion.div>
        )}

        {/* Preset avatars */}
        {!isForced && <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.3 }}
          className="bg-white border border-ninja-border rounded-2xl p-5 shadow-sm"
        >
          <p className="text-ninja-muted font-ninja text-xs font-semibold uppercase tracking-wide mb-3">Choose Avatar</p>
          <div className="grid grid-cols-5 gap-3">
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
        </motion.div>}

        {/* Appearance */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.3 }}
          className="bg-white border border-ninja-border rounded-2xl p-5 shadow-sm"
        >
          <p className="text-ninja-muted font-ninja text-xs font-semibold uppercase tracking-wide mb-3">Appearance</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${dark ? 'text-yellow-300 bg-yellow-400/10' : 'text-ninja-muted bg-ninja-bg'}`}
              >
                {dark ? (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                ) : (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
                )}
              </span>
              <div>
                <p className="text-ninja-navy font-ninja font-semibold text-sm">Dark mode</p>
                <p className="text-ninja-muted font-ninja text-xs">{dark ? 'On' : 'Off'}</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={dark}
              aria-label="Toggle dark mode"
              onClick={toggle}
              className={`relative w-12 h-7 rounded-full flex-shrink-0 transition-colors duration-200 ${dark ? 'bg-ninja-blue' : 'bg-ninja-border'}`}
            >
              <motion.span
                layout
                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md ${dark ? 'right-1' : 'left-1'}`}
              />
            </button>
          </div>
        </motion.div>

        {/* Experimental */}
        {!isForced && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.09, duration: 0.3 }}
          className="bg-white border border-ninja-border rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${experimental ? 'text-ninja-blue bg-ninja-blue/10' : 'text-ninja-muted bg-ninja-bg'}`}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6M10 3v6.5L5 18a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-8.5V3" /><path d="M7.5 14h9" /></svg>
              </span>
              <div>
                <p className="text-ninja-navy font-ninja font-semibold text-sm">Experimental features</p>
                <p className="text-ninja-muted font-ninja text-xs">Unlock in-progress extras. May change or break.</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={experimental}
              aria-label="Toggle experimental features"
              onClick={() => setExperimental(!experimental)}
              className={`relative w-12 h-7 rounded-full flex-shrink-0 transition-colors duration-200 ${experimental ? 'bg-ninja-blue' : 'bg-ninja-border'}`}
            >
              <motion.span
                layout
                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md ${experimental ? 'right-1' : 'left-1'}`}
              />
            </button>
          </div>

          <AnimatePresence initial={false}>
            {experimental && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                className="overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => navigate('/appearance')}
                  className="mt-4 w-full flex items-center justify-between rounded-xl border border-ninja-border p-3 text-left transition-[transform,border-color] duration-150 ease-[var(--ease-out)] hover:border-ninja-blue/50 active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl flex items-center justify-center text-ninja-blue bg-ninja-blue/10">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r="1" /><circle cx="17.5" cy="10.5" r="1" /><circle cx="8.5" cy="7.5" r="1" /><circle cx="6.5" cy="12.5" r="1" /><path d="M12 2C6.5 2 2 6 2 11a5 5 0 0 0 5 5h1.5a2 2 0 0 1 2 2 2 2 0 0 0 2 2c5.5 0 10-4.5 10-10S17.5 2 12 2z" /></svg>
                    </span>
                    <div>
                      <p className="text-ninja-navy font-ninja font-semibold text-sm">Theme &amp; color</p>
                      <p className="text-ninja-muted font-ninja text-xs">Accent color picker &amp; more</p>
                    </div>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-ninja-muted"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        )}

        {/* What's New */}
        <motion.a
          href="/changelog"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="block bg-white border border-ninja-border rounded-2xl p-5 shadow-sm hover:border-ninja-blue/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl flex items-center justify-center text-ninja-blue bg-ninja-blue/10">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 2a10 10 0 1 0 10 10" /><path d="M12 7v5l3 2" /></svg>
              </span>
              <div>
                <p className="text-ninja-navy font-ninja font-semibold text-sm">What's New</p>
                <p className="text-ninja-muted font-ninja text-xs">Latest updates &amp; changes</p>
              </div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-ninja-muted"><polyline points="9 18 15 12 9 6" /></svg>
          </div>
        </motion.a>

        {/* Getting Started */}
        {ONBOARDING_ENABLED && (
        <motion.a
          href="/getting-started"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.11, duration: 0.3 }}
          className="block bg-white border border-ninja-border rounded-2xl p-5 shadow-sm hover:border-ninja-blue/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl flex items-center justify-center text-ninja-blue bg-ninja-blue/10">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" /></svg>
              </span>
              <div>
                <p className="text-ninja-navy font-ninja font-semibold text-sm">Getting Started</p>
                <p className="text-ninja-muted font-ninja text-xs">How to use DojoLink</p>
              </div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-ninja-muted"><polyline points="9 18 15 12 9 6" /></svg>
          </div>
        </motion.a>
        )}

        {/* Location */}
        {!isForced && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.09, duration: 0.3 }}
            className="bg-white border border-ninja-border rounded-2xl p-5 shadow-sm"
          >
            <p className="text-ninja-muted font-ninja text-xs font-semibold uppercase tracking-wide mb-3">Location</p>
            {(['manager', 'admin'].includes(user?.role) || (user?.availableLocations?.length > 1)) ? (
              <select
                value={user?.activeLocation?.id ?? ''}
                onChange={(e) => switchLocation(Number(e.target.value))}
                className="w-full bg-ninja-bg border border-ninja-border text-ninja-navy rounded-lg px-3 py-2.5 font-ninja text-sm font-semibold focus:outline-none focus:border-ninja-blue"
              >
                {user?.availableLocations?.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-ninja-bg text-ninja-blue flex items-center justify-center flex-shrink-0">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                </span>
                <p className="text-ninja-navy font-ninja font-semibold text-sm truncate">{user?.activeLocation?.name ?? '—'}</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Username + Password */}
        <motion.form
          onSubmit={handleSave}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="bg-white border border-ninja-border rounded-2xl p-6 shadow-sm space-y-5"
        >
          {!isForced && (
            <div>
              <label className="block text-ninja-muted text-xs font-ninja font-semibold uppercase tracking-wide mb-1.5">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={80}
                autoComplete="name"
                className="w-full bg-ninja-bg border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue"
              />
              <p className="text-ninja-muted font-ninja text-xs mt-1.5">Shown across the app and to parents.</p>
            </div>
          )}

          {!isForced && (
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
          )}

          <div className={`${isForced ? '' : 'border-t border-ninja-border pt-5 '}space-y-4`}>
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
            {newPassword && !isForced && (
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
