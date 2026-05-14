import { useState, useRef } from 'react';
import Layout from '../components/layout/Layout';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function AccountPage() {
  const { user, setUser } = useAuth();
  const fileRef = useRef(null);

  const [username, setUsername] = useState(user?.username || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [uploadingPic, setUploadingPic] = useState(false);
  const [picError, setPicError] = useState('');

  const initials = user?.displayName?.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?';

  const handlePicChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return setPicError('Please select an image file.');
    if (file.size > 5 * 1024 * 1024) return setPicError('Image must be under 5 MB.');

    setPicError('');
    setUploadingPic(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `users/${user.id}/avatar.${ext}`;
      const { data, error: uploadErr } = await supabase.storage
        .from('profile-pics')
        .upload(path, file, { upsert: true, cacheControl: '3600' });
      if (uploadErr) throw new Error(uploadErr.message);

      const { data: { publicUrl } } = supabase.storage.from('profile-pics').getPublicUrl(data.path);
      // Bust cache by appending timestamp
      const bustedUrl = `${publicUrl}?t=${Date.now()}`;

      await api.patch('/users/me/avatar', { profile_pic_url: publicUrl });
      setUser((prev) => ({ ...prev, profilePicUrl: bustedUrl }));
    } catch (err) {
      setPicError('Upload failed. Try again.');
    } finally {
      setUploadingPic(false);
      e.target.value = '';
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmedUsername = username.trim();
    const trimmedPassword = newPassword.trim();

    if (!trimmedUsername && !trimmedPassword) return setError('Enter a new username or password.');
    if (trimmedPassword && trimmedPassword !== confirmPassword.trim()) return setError('Passwords do not match.');
    if (trimmedPassword && trimmedPassword.length < 6) return setError('Password must be at least 6 characters.');

    const payload = {};
    if (trimmedUsername && trimmedUsername !== user?.username) payload.username = trimmedUsername;
    if (trimmedPassword) payload.new_password = trimmedPassword;
    if (!Object.keys(payload).length) return setSuccess('No changes to save.');

    setSaving(true);
    try {
      await api.patch('/users/me', payload);
      if (payload.username) setUser((prev) => ({ ...prev, username: payload.username }));
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
          <p className="text-ninja-muted font-ninja text-sm mt-1">Update your profile photo, username, or password.</p>
        </div>

        {/* Profile photo */}
        <div className="bg-white border border-ninja-border rounded-2xl p-6 shadow-sm">
          <p className="text-ninja-muted text-xs font-ninja font-semibold uppercase tracking-wide mb-4">Profile Photo</p>
          <div className="flex items-center gap-5">
            <div className="relative flex-shrink-0">
              {user?.profilePicUrl ? (
                <img
                  src={user.profilePicUrl}
                  alt={user.displayName}
                  className="w-20 h-20 rounded-full object-cover border-2 border-ninja-border"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-ninja-blue flex items-center justify-center text-white font-ninja font-bold text-2xl">
                  {initials}
                </div>
              )}
              {uploadingPic && (
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadingPic}
                className="text-sm font-ninja font-semibold text-ninja-blue border border-ninja-blue rounded-xl px-4 py-2 hover:bg-ninja-blue hover:text-white transition-colors disabled:opacity-50"
              >
                {uploadingPic ? 'Uploading...' : 'Change Photo'}
              </button>
              <p className="text-ninja-muted font-ninja text-xs">JPG, PNG, or GIF · Max 5 MB</p>
              {picError && <p className="text-ninja-red font-ninja text-xs">{picError}</p>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePicChange} />
          </div>
        </div>

        {/* Username + Password */}
        <form onSubmit={handleSave} className="bg-white border border-ninja-border rounded-2xl p-6 shadow-sm space-y-5">
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
        </form>
      </div>
    </Layout>
  );
}
