const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/codeninjas.db');

function hasColumn(db, table, col) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === col);
}

function initDb() {
  // Ensure the data directory exists
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const db = new Database(DB_PATH);

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Read and execute schema
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);

  // Migrations: add columns that didn't exist at initial schema creation
  if (!hasColumn(db, 'students', 'birthday')) {
    db.exec('ALTER TABLE students ADD COLUMN birthday DATE');
  }

  if (!hasColumn(db, 'users', 'location_id')) {
    db.exec('ALTER TABLE users ADD COLUMN location_id INTEGER REFERENCES locations(id)');
  }

  if (!hasColumn(db, 'students', 'location_id')) {
    db.exec('ALTER TABLE students ADD COLUMN location_id INTEGER REFERENCES locations(id)');
  }

  return db;
}

module.exports = { initDb, DB_PATH };
