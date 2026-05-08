-- Run this in the Supabase SQL editor to set up the schema

CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('manager','sensei')),
  active BOOLEAN DEFAULT TRUE,
  location_id INTEGER REFERENCES locations(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  birthday DATE,
  active BOOLEAN DEFAULT TRUE,
  pinned_note TEXT,
  location_id INTEGER REFERENCES locations(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Per-program enrollment with belt/project tracking (CREATE only uses belt fields)
CREATE TABLE IF NOT EXISTS student_programs (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  program TEXT NOT NULL CHECK(program IN ('CREATE','Robotics Academy','AI Academy','JR')),
  belt_level TEXT CHECK(belt_level IN ('White','Yellow','Orange','Green','Blue','Purple','Brown','Red','Black')),
  belt_sublevel INTEGER,
  current_project TEXT CHECK(current_project IN ('Build 1','Build 2','Build 3','Solve 1','Solve 2','Solve 3','Adventure')),
  project_status TEXT CHECK(project_status IN ('Started','Working On','Completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, program)
);

CREATE TABLE IF NOT EXISTS daily_assignments (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id),
  program TEXT NOT NULL CHECK(program IN ('CREATE','Robotics Academy','AI Academy','JR')),
  sensei_id INTEGER REFERENCES users(id),
  session_date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, program, session_date)
);

CREATE TABLE IF NOT EXISTS progress_logs (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id),
  program TEXT NOT NULL CHECK(program IN ('CREATE','Robotics Academy','AI Academy','JR')),
  sensei_id INTEGER NOT NULL REFERENCES users(id),
  session_date DATE NOT NULL,
  belt_level_at TEXT,
  belt_sublevel_at INTEGER,
  project_at TEXT,
  status_at TEXT,
  notes TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
