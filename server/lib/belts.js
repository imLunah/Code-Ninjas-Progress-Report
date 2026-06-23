// Shared belt-value validation. Single source of truth for the belt labels and
// sublevel bounds so the progress and student-program write paths can't diverge
// (the DB CHECK lists must stay in sync with these — see CLAUDE.md).

// The nine standard CREATE belts that may auto-overwrite a student's tracked belt.
const STANDARD_BELTS = new Set(['White', 'Yellow', 'Orange', 'Green', 'Blue', 'Purple', 'Brown', 'Red', 'Black']);
// Every real belt label that may be stored. Superset of STANDARD_BELTS with the
// four bonus-track belts (Bronze/Silver/Platinum/Gold), which can be logged but
// never auto-overwrite the tracked belt.
const ALL_BELTS = new Set([...STANDARD_BELTS, 'Bronze', 'Silver', 'Platinum', 'Gold']);

// True when belt is absent (null/undefined) or a real belt label.
function isValidBelt(belt) {
  return belt == null || ALL_BELTS.has(belt);
}

// Validate a belt sublevel against the real per-belt max (source of truth:
// belt_level_projects). With a known belt it's capped at that belt's max; with
// no belt given it's capped at the global max. Returns an error string or null.
// Blocks junk like 1000 and non-positive / non-integer values.
async function validateSublevel(pool, belt, sublevel) {
  if (sublevel == null) return null;
  if (!Number.isInteger(sublevel) || sublevel < 1) return 'Invalid belt level';
  const { rows } = await pool.query(
    'SELECT COALESCE(MAX(sublevel), 0) AS max_sub FROM belt_level_projects WHERE $1::text IS NULL OR belt_name = $1',
    [belt ?? null]
  );
  if (sublevel > parseInt(rows[0].max_sub, 10)) return 'Invalid belt level';
  return null;
}

module.exports = { STANDARD_BELTS, ALL_BELTS, isValidBelt, validateSublevel };
