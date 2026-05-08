CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('manager','sensei')),
  location_id INTEGER REFERENCES locations(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  program TEXT NOT NULL CHECK(program IN ('CREATE','Robotics Academy','AI Academy','JR')),
  belt_level TEXT CHECK(belt_level IN ('White','Yellow','Orange','Green','Blue','Purple','Brown','Red','Black')),
  belt_sublevel INTEGER,
  current_project TEXT CHECK(current_project IN ('Build 1','Build 2','Build 3','Solve 1','Solve 2','Solve 3','Adventure')),
  project_status TEXT CHECK(project_status IN ('Started','Working On','Completed')),
  birthday DATE,
  active INTEGER DEFAULT 1,
  location_id INTEGER REFERENCES locations(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id),
  sensei_id INTEGER REFERENCES users(id),
  session_date DATE NOT NULL,
  completed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, session_date)
);

CREATE TABLE IF NOT EXISTS progress_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id),
  sensei_id INTEGER NOT NULL REFERENCES users(id),
  session_date DATE NOT NULL,
  belt_level_at TEXT,
  belt_sublevel_at INTEGER,
  project_at TEXT,
  status_at TEXT,
  notes TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
