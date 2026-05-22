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

// Blocks writes when a manager is viewing a center other than their own (admin bypasses)
function requireOwnLocation(req, res, next) {
  if (req.session.role === 'admin') return next();
  if (req.session.activeLocationId !== req.session.homeLocationId) {
    return res.status(403).json({ error: 'You can only make changes at your own center.' });
  }
  next();
}

function requireParent(req, res, next) {
  if (!req.session.parentEmail) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

module.exports = { requireAuth, requireManager, requireSensei, requireOwnLocation, requireParent };
