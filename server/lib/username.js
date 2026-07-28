// Usernames are login credentials, so they have to be typeable and
// unambiguous. Nothing validated the format before this: spaces, punctuation
// and anything else were accepted on every create and update path, and one
// live account ended up with a space in it.
//
// Letters, digits, dot, underscore and hyphen. No spaces, no case rules — the
// stored casing is kept, but every lookup and uniqueness check is
// case-insensitive, so `Alex` and `alex` can never both exist.
const USERNAME_RE = /^[A-Za-z0-9._-]+$/;
const MIN = 3;
const MAX = 50;

// Returns { value } on success, { error } on failure.
function validateUsername(raw) {
  if (typeof raw !== 'string') return { error: 'Username is required' };
  const value = raw.trim();
  if (!value) return { error: 'Username is required' };
  if (value.length < MIN) return { error: `Username must be at least ${MIN} characters` };
  if (value.length > MAX) return { error: `Username too long (max ${MAX} chars)` };
  if (/\s/.test(value)) return { error: 'Username cannot contain spaces' };
  if (!USERNAME_RE.test(value)) {
    return { error: 'Username can only use letters, numbers, dots, underscores and hyphens' };
  }
  return { value };
}

module.exports = { validateUsername, USERNAME_RE, USERNAME_MIN: MIN, USERNAME_MAX: MAX };
