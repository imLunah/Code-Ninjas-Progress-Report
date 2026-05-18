const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const pgSession = require('connect-pg-simple')(session);
const pool = require('./db/pool');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable must be set in production');
}
const SESSION_SECRET = process.env.SESSION_SECRET || 'codeninjas-dev-secret-do-not-use-in-prod';

app.set('db', pool);

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CSRF mitigation: require custom header on all state-changing requests
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
app.use((req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  if (req.headers['x-requested-with'] === 'XMLHttpRequest') return next();
  return res.status(403).json({ error: 'Forbidden' });
});

// Rate limiting on login endpoints
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
});

const sessionConfig = {
  store: new pgSession({ pool, tableName: 'session' }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
};

// Staff session (connect.sid) — skipped for /api/parent so it can't be corrupted
const staffSession = session(sessionConfig);
app.use((req, res, next) => {
  if (req.path.startsWith('/api/parent')) return next();
  staffSession(req, res, next);
});

// Parent portal uses its own cookie (parent.sid) — completely isolated from staff
const parentSession = session({ ...sessionConfig, name: 'parent.sid' });

app.use('/api/auth', require('./routes/auth'));
app.use('/api/parent', parentSession, require('./routes/parent'));
app.use('/api/students', require('./routes/students'));
app.use('/api/daily', require('./routes/daily'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/clubs', require('./routes/clubs'));
app.use('/api/users', require('./routes/users'));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Code Ninjas server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
