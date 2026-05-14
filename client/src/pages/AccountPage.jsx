import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../components/layout/Layout';
import CropModal from '../components/ui/CropModal';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';


export default function AccountPage() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [username, setUsername] = useState(user?.username || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [uploadingPic, setUploadingPic] = useState(false);
  const [picError, setPicError] = useState('');
  const [cropSrc, setCropSrc] = useState(null);

  const initials = user?.displayName?.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?';

  const handlePicChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return setPicError('Please select an image file.');
    if (file.size > 5 * 1024 * 1024) return setPicError('Image must be under 5 MB.');
    setPicError('');
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropConfirm = async (blob) => {
    setCropSrc(null);
    setUploadingPic(true);
    try {
      const path = `users/${user.id}/avatar.jpg`;
      const { data, error: uploadErr } = await supabase.storage
        .from('profile-pics')
        .upload(path, blob, { upsert: true, cacheControl: '3600', contentType: 'image/jpeg' });
      if (uploadErr) throw new Error(uploadErr.message);

      const { data: { publicUrl } } = supabase.storage.from('profile-pics').getPublicUrl(data.path);
      const bustedUrl = `${publicUrl}?t=${Date.now()}`;
      await api.patch('/users/me/avatar', { profile_pic_url: publicUrl });
      setUser((prev) => ({ ...prev, profilePicUrl: bustedUrl }));
    } catch (err) {
      setPicError('Upload failed. Try again.');
    } finally {
      setUploadingPic(false);
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
              {uploadingPic && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-ninja font-bold text-lg leading-tight truncate">{user?.displayName}</p>
              <p className="text-white/50 font-ninja text-xs mt-0.5 capitalize">{user?.role === 'manager' ? 'Center Director' : 'Sensei'}</p>
              <p className="text-white/40 font-ninja text-xs">@{user?.username}</p>
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingPic}
              className="flex-shrink-0 text-xs font-ninja font-semibold text-white/80 border border-white/20 rounded-xl px-3 py-1.5 hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              {uploadingPic ? 'Uploading…' : 'Edit Photo'}
            </button>
          </div>
          {picError && <p className="text-red-300 font-ninja text-xs mt-2 relative z-10">{picError}</p>}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePicChange} />
          {cropSrc && (
            <CropModal
              imageSrc={cropSrc}
              onConfirm={handleCropConfirm}
              onCancel={() => { setCropSrc(null); }}
            />
          )}
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
