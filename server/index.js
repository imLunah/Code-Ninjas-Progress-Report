const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const { initDb, DB_PATH } = require('./db/init');

const app = express();
const PORT = process.env.PORT || 3001;
const SESSION_SECRET = process.env.SESSION_SECRET || 'codeninjas-default-secret-change-me';

// Initialize database
const db = initDb();
app.set('db', db);

// Session store using better-sqlite3-session-store
const BetterSQLiteStore = require('better-sqlite3-session-store')(session);
const sessionStore = new BetterSQLiteStore({ client: db, expired: { clear: true, intervalMs: 900000 } });

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  store: sessionStore,
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
}));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/daily', require('./routes/daily'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/users', require('./routes/users'));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Code Ninjas server running on http://localhost:${PORT}`);
});
