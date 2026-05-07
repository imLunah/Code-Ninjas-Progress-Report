const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/codeninjas.db');

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
  const studentCols = db.prepare('PRAGMA table_info(students)').all().map(c => c.name);
  if (!studentCols.includes('birthday')) {
    db.exec('ALTER TABLE students ADD COLUMN birthday DATE');
  }

  return db;
}

module.exports = { initDb, DB_PATH };
