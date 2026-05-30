function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  if (!req.session.activeLocationId) return res.status(403).json({ error: 'No active location. Please log in again.' });
  next();
}

function requireManager(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  if (!['manager', 'admin'].includes(req.session.role)) return res.status(403).json({ error: 'Manager only' });
  next();
}

function requireSensei(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  if (!['manager', 'sensei', 'admin'].includes(req.session.role)) return res.status(403).json({ error: 'Sensei required' });
  next();
}

// Blocks writes when a manager is viewing a center other than their own (admin bypasses).
// Also re-validates on every write that the location is still active, so deactivating a
// location mid-session immediately blocks new writes from existing sessions.
async function requireOwnLocation(req, res, next) {
  if (req.session.role === 'admin') return next();
  if (req.session.activeLocationId !== req.session.homeLocationId) {
    return res.status(403).json({ error: 'You can only make changes at your own center.' });
  }
  try {
    const pool = req.app.get('db');
    const { rows } = await pool.query(
      'SELECT 1 FROM locations WHERE id = $1 AND active = true',
      [req.session.activeLocationId]
    );
    if (!rows[0]) return res.status(403).json({ error: 'Your center is no longer active.' });
  } catch {
    return res.status(500).json({ error: 'Internal server error' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  if (req.session.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

function requireParent(req, res, next) {
  if (!req.session.parentEmail) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

module.exports = { requireAuth, requireManager, requireSensei, requireOwnLocation, requireParent, requireAdmin };
