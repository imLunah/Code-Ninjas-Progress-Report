import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/client';

// Bridges the theme to the logged-in account so dark/light + accent follow the
// user across devices. localStorage still drives the instant (no-flash) first
// paint; once a session loads we apply the account's saved theme, and every
// user-initiated change is persisted server-side (debounced).
export default function ThemeSync() {
  const { user } = useAuth();
  const { settings, rev, hydrate } = useTheme();
  const appliedFor = useRef(null);
  const lastRev = useRef(rev);

  // Apply the account's saved theme once per login.
  useEffect(() => {
    if (!user) { appliedFor.current = null; return; }
    if (appliedFor.current === user.id) return;
    appliedFor.current = user.id;
    lastRev.current = rev; // applying server theme must not count as a user change
    if (user.theme && (user.theme.mode || user.theme.accent)) {
      hydrate(user.theme.mode, user.theme.accent ?? 'default');
    }
  }, [user, rev, hydrate]);

  // Persist user-initiated changes (rev bumps) while signed in.
  useEffect(() => {
    if (rev === lastRev.current) return;
    lastRev.current = rev;
    if (!user || appliedFor.current !== user.id) return;
    const t = setTimeout(() => {
      api.patch('/users/me/theme', { mode: settings.mode, accent: settings.accentColor }).catch(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [rev, user, settings]);

  return null;
}
