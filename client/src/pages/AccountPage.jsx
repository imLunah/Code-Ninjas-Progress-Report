import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/layout/Layout';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ONBOARDING_ENABLED } from '../lib/features';
import { PRESET_AVATARS } from '../lib/avatars';
import { CARD } from '../lib/surfaces';
import { MoonIcon, SunIcon } from '../components/ui/icons';
import {
  UserIcon,
  LockIcon,
  FlaskConicalIcon as FlaskIcon,
  CircleQuestionMarkIcon as HelpIcon,
  PaletteIcon,
  ChevronRightIcon as Chevron,
  MapPinIcon,
  PanelTopIcon,
} from 'lucide-react';

// Desktop gets a settings rail + pane; the phone keeps the single scroll.
// Matched in JS rather than with `lg:hidden` on both layouts, so only one of
// them is ever in the DOM — two copies would mean two sets of form inputs.
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = (e) => setIsDesktop(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isDesktop;
}

const FIELD =
  'w-full bg-ninja-bg border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue';
const LABEL = 'block text-ninja-muted text-xs font-ninja font-semibold uppercase tracking-wide mb-1.5';

export default function AccountPage() {
  const { user, setUser, logout, switchLocation } = useAuth();
  const { dark, toggle, experimental, setExperimental, horizontalNav, setHorizontalNav } = useTheme();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();

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

  const [section, setSection] = useState('profile');

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

  const roleLabel = user?.role === 'manager' ? 'Center Director' : user?.role === 'admin' ? 'Admin' : 'Sensei';

  const dashPath = user?.role === 'sensei' ? '/sensei/dashboard'
    : user?.role === 'admin' ? '/admin/locations'
    : '/manager/overview';

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
    if (!isForced && trimmedUsername && trimmedUsername !== user?.username) {
      // Mirrors server/lib/username.js. The server is still the authority.
      if (trimmedUsername.length < 3) return setError('Username must be at least 3 characters.');
      if (!/^[A-Za-z0-9._-]+$/.test(trimmedUsername)) {
        return setError('Username can only use letters, numbers, dots, underscores and hyphens. No spaces.');
      }
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

  /* ------------------------------------------------------------- pieces -- */
  // Each block is built once and placed by whichever layout is active.

  const identity = (
    <div className="relative bg-[#dbe4f2] dark:bg-ninja-hero rounded-2xl overflow-hidden px-6 pt-7 pb-6 shadow-lg">
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
          <p className="text-ninja-muted font-ninja text-xs mt-0.5 capitalize">{roleLabel}</p>
          <p className="text-ninja-muted/70 font-ninja text-xs">@{user?.username}</p>
        </div>
      </div>
      {avatarError && <p className="text-ninja-red dark:text-red-300 font-ninja text-xs mt-2 relative z-10">{avatarError}</p>}
    </div>
  );

  const forcedBanner = isForced && (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
      <LockIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-amber-800 font-ninja font-semibold text-sm">Password reset required</p>
        <p className="text-amber-700 font-ninja text-xs mt-0.5">Your password was reset by an admin. Set a new password to continue.</p>
      </div>
    </div>
  );

  const avatarPicker = (
    <div className={`${CARD} p-5`}>
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
    </div>
  );

  // Mobile only: the desktop sidebar already carries the same toggle.
  const appearanceCard = (
    <div className={`${CARD} p-5`}>
      <p className="text-ninja-muted font-ninja text-xs font-semibold uppercase tracking-wide mb-3">Appearance</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span aria-hidden className={`w-9 h-9 rounded-xl flex items-center justify-center ${dark ? 'text-yellow-300 bg-yellow-400/10' : 'text-ninja-muted bg-ninja-bg'}`}>
            {dark ? <MoonIcon width="17" height="17" /> : <SunIcon width="17" height="17" />}
          </span>
          <div>
            <p className="text-ninja-navy font-ninja font-semibold text-sm">Dark mode</p>
            <p className="text-ninja-muted font-ninja text-xs">{dark ? 'On' : 'Off'}</p>
          </div>
        </div>
        <button
          type="button" role="switch" aria-checked={dark} aria-label="Toggle dark mode" onClick={toggle}
          className={`relative w-12 h-7 rounded-full flex-shrink-0 transition-colors duration-200 ${dark ? 'bg-ninja-blue' : 'bg-ninja-border'}`}
        >
          <motion.span layout transition={{ type: 'spring', stiffness: 500, damping: 32 }}
            className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md ${dark ? 'right-1' : 'left-1'}`} />
        </button>
      </div>
    </div>
  );

  const experimentalCard = (
    <div className={`${CARD} p-5`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${experimental ? 'text-ninja-blue-ink bg-ninja-blue/10' : 'text-ninja-muted bg-ninja-bg'}`}>
            <FlaskIcon width="17" height="17" />
          </span>
          <div>
            <p className="text-ninja-navy font-ninja font-semibold text-sm">Experimental features</p>
            <p className="text-ninja-muted font-ninja text-xs">Unlock in-progress extras. May change or break.</p>
          </div>
        </div>
        <button
          type="button" role="switch" aria-checked={experimental} aria-label="Toggle experimental features"
          onClick={() => setExperimental(!experimental)}
          className={`relative w-12 h-7 rounded-full flex-shrink-0 transition-colors duration-200 ${experimental ? 'bg-ninja-blue' : 'bg-ninja-border'}`}
        >
          <motion.span layout transition={{ type: 'spring', stiffness: 500, damping: 32 }}
            className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md ${experimental ? 'right-1' : 'left-1'}`} />
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
                <span className="w-9 h-9 rounded-xl flex items-center justify-center text-ninja-blue-ink bg-ninja-blue/10">
                  <PaletteIcon width="17" height="17" />
                </span>
                <div>
                  <p className="text-ninja-navy font-ninja font-semibold text-sm">Theme &amp; color</p>
                  <p className="text-ninja-muted font-ninja text-xs">Accent color picker &amp; more</p>
                </div>
              </div>
              <Chevron width="18" height="18" className="text-ninja-muted" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // Desktop-only setting, so it only appears in the desktop layout's rail.
  // Picked from little window previews rather than a switch, so you can see
  // what each layout looks like before committing to it.
  const navLayouts = [
    {
      value: false,
      label: 'Sidebar',
      preview: (
        <div className="flex h-full">
          <div className="w-[26%] border-r border-ninja-border bg-white p-1.5 space-y-1.5">
            <div className="h-1.5 w-full rounded-full bg-ninja-blue/50" />
            <div className="h-1.5 w-full rounded-full bg-ninja-border" />
            <div className="h-1.5 w-3/4 rounded-full bg-ninja-border" />
          </div>
          <div className="flex-1 p-1.5 space-y-1.5">
            <div className="h-2 w-1/2 rounded-full bg-ninja-border" />
            <div className="h-6 w-full rounded-md bg-white border border-ninja-border" />
            <div className="h-6 w-full rounded-md bg-white border border-ninja-border" />
          </div>
        </div>
      ),
    },
    {
      value: true,
      label: 'Top bar',
      preview: (
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-1.5 border-b border-ninja-border bg-white px-1.5 py-1">
            <div className="h-1.5 w-1/4 rounded-full bg-ninja-blue/50" />
            <div className="h-1.5 w-1/5 rounded-full bg-ninja-border" />
            <div className="h-1.5 w-1/5 rounded-full bg-ninja-border" />
          </div>
          <div className="flex-1 p-1.5 space-y-1.5">
            <div className="h-2 w-1/2 rounded-full bg-ninja-border" />
            <div className="h-6 w-full rounded-md bg-white border border-ninja-border" />
            <div className="h-6 w-full rounded-md bg-white border border-ninja-border" />
          </div>
        </div>
      ),
    },
  ];

  const displayCard = (
    <div className={`${CARD} p-5`}>
      <div className="flex items-center gap-3 mb-4">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center text-ninja-blue-ink bg-ninja-blue/10">
          <PanelTopIcon width="17" height="17" />
        </span>
        <div>
          <p className="text-ninja-navy font-ninja font-semibold text-sm">Navigation layout</p>
          <p className="text-ninja-muted font-ninja text-xs">Where the nav lives on desktop. Only follows this device.</p>
        </div>
      </div>
      <div role="radiogroup" aria-label="Navigation layout" className="grid grid-cols-2 gap-4 max-w-md">
        {navLayouts.map(({ value, label, preview }) => {
          const selected = horizontalNav === value;
          return (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setHorizontalNav(value)}
              className="group text-center"
            >
              <div
                className={`aspect-[16/10] rounded-xl overflow-hidden border-2 bg-ninja-bg transition-all ${
                  selected
                    ? 'border-ninja-blue ring-2 ring-ninja-blue/30'
                    : 'border-ninja-border group-hover:border-ninja-blue/50'
                }`}
              >
                {preview}
              </div>
              <p className={`mt-2 font-ninja text-sm transition-colors ${
                selected ? 'text-ninja-navy font-bold' : 'text-ninja-muted font-semibold group-hover:text-ninja-navy'
              }`}>
                {label}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );

  // Mobile only: the desktop sidebar carries the centre switcher.
  const locationCard = (
    <div className={`${CARD} p-5`}>
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
            <MapPinIcon width="17" height="17" />
          </span>
          <p className="text-ninja-navy font-ninja font-semibold text-sm truncate">{user?.activeLocation?.name ?? '—'}</p>
        </div>
      )}
    </div>
  );

  const gettingStarted = ONBOARDING_ENABLED && (
    <a href="/getting-started" className={`block ${CARD} p-5 hover:border-ninja-blue/50 transition-colors`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center text-ninja-blue-ink bg-ninja-blue/10">
            <HelpIcon width="17" height="17" />
          </span>
          <div>
            <p className="text-ninja-navy font-ninja font-semibold text-sm">Getting Started</p>
            <p className="text-ninja-muted font-ninja text-xs">How to use DojoLink</p>
          </div>
        </div>
        <Chevron width="18" height="18" className="text-ninja-muted" />
      </div>
    </a>
  );

  const messages = (
    <>
      {error && <p className="text-ninja-red font-ninja text-sm">{error}</p>}
      {success && <p className="text-green-600 font-ninja text-sm">{success}</p>}
    </>
  );

  const saveButton = (
    <button
      type="submit"
      disabled={saving}
      className="w-full bg-ninja-blue text-white font-ninja font-bold text-sm py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
    >
      {saving ? 'Saving...' : 'Save Changes'}
    </button>
  );

  const nameFields = (
    <>
      <div>
        <label className={LABEL}>Display Name</label>
        <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={80} autoComplete="name" className={FIELD} />
        <p className="text-ninja-muted font-ninja text-xs mt-1.5">Shown across the app and to parents.</p>
      </div>
      <div>
        <label className={LABEL}>Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          spellCheck={false}
          autoCapitalize="none"
          className={FIELD}
        />
        <p className="text-ninja-muted font-ninja text-xs mt-1.5">
          Letters, numbers, dots, underscores and hyphens. No spaces.
        </p>
      </div>
    </>
  );

  const passwordFields = (
    <>
      <div>
        <label className="block text-ninja-muted text-xs font-ninja mb-1.5">New Password</label>
        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Leave blank to keep current" autoComplete="new-password" className={FIELD} />
      </div>
      {newPassword && !isForced && (
        <div>
          <label className="block text-ninja-muted text-xs font-ninja mb-1.5">Current Password</label>
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Confirm your current password" autoComplete="current-password" className={FIELD} />
        </div>
      )}
      <div>
        <label className="block text-ninja-muted text-xs font-ninja mb-1.5">Confirm New Password</label>
        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" className={FIELD} />
      </div>
    </>
  );

  const signOut = (
    <button
      onClick={async () => { try { await logout(); } catch { /* sign out locally anyway */ } navigate('/login'); }}
      className="w-full border border-ninja-red text-ninja-red font-ninja font-semibold text-sm py-2.5 rounded-xl hover:bg-red-50 transition-colors"
    >
      Sign Out
    </button>
  );

  /* ------------------------------------------------- forced reset layout -- */
  // One narrow column: this flow is the banner and the password form, nothing
  // else, and a rail with a single reachable item would be noise.
  if (isForced) {
    return (
      <Layout>
        <div className="mx-auto w-full max-w-md space-y-6">
          {identity}
          {forcedBanner}
          <form onSubmit={handleSave} className={`${CARD} p-6 space-y-5`}>
            <div className="space-y-4">
              <p className="text-ninja-muted font-ninja text-xs font-semibold uppercase tracking-wide">Change Password</p>
              {passwordFields}
            </div>
            {messages}
            {saveButton}
          </form>
          {signOut}
        </div>
      </Layout>
    );
  }

  /* ------------------------------------------------------ desktop layout -- */
  if (isDesktop) {
    const GROUPS = [
      { title: 'Your account', items: [
        { key: 'profile', label: 'Edit profile', Icon: UserIcon },
        { key: 'password', label: 'Password', Icon: LockIcon },
      ] },
      { title: 'Preferences', items: [
        { key: 'display', label: 'Display', Icon: PanelTopIcon },
        { key: 'preferences', label: 'Experimental', Icon: FlaskIcon },
        ...(ONBOARDING_ENABLED ? [{ key: 'help', label: 'Getting started', Icon: HelpIcon }] : []),
      ] },
    ];

    const HEADINGS = {
      profile: 'Edit profile',
      password: 'Password',
      display: 'Display',
      preferences: 'Preferences',
      help: 'Getting started',
    };

    return (
      <Layout>
        {/* Fills the width main gives it, like the dashboard does. Capped and
            centred, collapsing the sidebar just turned the freed space into
            margin instead of giving the content room. The pane caps its own
            content below so form fields don't stretch across a wide monitor;
            leftover space lands to the right rather than as dead margin on
            both sides. */}
        <div className="w-full">
          {/* No items-start on the grid: that shrinks each column to its own
              content height, which leaves a sticky child nowhere to travel.
              The column stretches, and the sticky element lives inside it. */}
          <div className="grid grid-cols-[272px_1fr]">
            {/* Rail. The page title lives in here rather than above the grid so
                it stays put with the sections and Sign Out while the pane
                scrolls past. Active state is a background tint and text colour
                only, no left-edge marker. The divider sits on this grid item
                rather than on the sticky block inside it, so the line runs the
                whole height of the pane instead of stopping where the rail
                content ends. */}
            <div className="pr-8 border-r border-ninja-border">
            <div className="space-y-6 sticky top-8 max-h-[calc(100dvh-5rem)] overflow-y-auto">
              <h1 className="font-ninja font-black text-2xl text-ninja-navy tracking-tight">Settings</h1>
            <nav aria-label="Settings sections" className="space-y-6">
              {GROUPS.map((group) => (
                <div key={group.title}>
                  <p className="px-3 mb-1.5 font-ninja text-xs font-bold uppercase tracking-wide text-ninja-muted">
                    {group.title}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map(({ key, label, Icon }) => {
                      const active = section === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSection(key)}
                          aria-current={active ? 'page' : undefined}
                          className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left font-ninja text-sm font-semibold transition-colors ${
                            active
                              ? 'bg-ninja-bg text-ninja-navy'
                              : 'text-ninja-muted hover:text-ninja-navy hover:bg-ninja-bg/60'
                          }`}
                        >
                          <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

            </nav>
              <div className="pt-4 border-t border-ninja-border">{signOut}</div>
            </div>
            </div>

            {/* Pane */}
            <motion.section
              key={section}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              aria-labelledby="section-heading"
              className="space-y-6 min-w-0 pl-10 max-w-3xl"
            >
              <h2 id="section-heading" className="font-ninja font-bold text-lg text-ninja-navy">
                {HEADINGS[section]}
              </h2>

              {section === 'profile' && (
                <>
                  {identity}
                  {avatarPicker}
                  <form onSubmit={handleSave} className={`${CARD} p-6 space-y-5`}>
                    {nameFields}
                    {messages}
                    {saveButton}
                  </form>
                </>
              )}

              {section === 'password' && (
                <form onSubmit={handleSave} className={`${CARD} p-6 space-y-4`}>
                  {passwordFields}
                  {messages}
                  {saveButton}
                </form>
              )}

              {section === 'display' && displayCard}
              {section === 'preferences' && experimentalCard}
              {section === 'help' && gettingStarted}
            </motion.section>
          </div>
        </div>
      </Layout>
    );
  }

  /* ------------------------------------------------------- mobile layout -- */
  return (
    <Layout>
      <div className="mx-auto w-full max-w-md space-y-6">
        {identity}
        {avatarPicker}
        {appearanceCard}
        {experimentalCard}
        {locationCard}
        {gettingStarted}

        <form onSubmit={handleSave} className={`${CARD} p-6 space-y-5`}>
          {nameFields}
          <div className="border-t border-ninja-border pt-5 space-y-4">
            <p className="text-ninja-muted font-ninja text-xs font-semibold uppercase tracking-wide">Change Password</p>
            {passwordFields}
          </div>
          {messages}
          {saveButton}
        </form>

        {signOut}
      </div>
    </Layout>
  );
}
