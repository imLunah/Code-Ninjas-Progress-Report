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
  parent_name TEXT,
  parent_email TEXT,
  parent_phone TEXT,
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
ALTER TABLE public.student_programs ENABLE ROW LEVEL SECURITY;

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
  sub_program TEXT,
  module_name TEXT,
  lesson_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('parent', 'staff')),
  sender_id INTEGER REFERENCES users(id),
  sender_name TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_student_id_idx ON messages(student_id);

CREATE TABLE IF NOT EXISTS club_sessions (
  id SERIAL PRIMARY KEY,
  club_name TEXT NOT NULL CHECK (club_name IN ('3D Design Club', 'Minecraft Club', 'Roblox Club')),
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  location_id INTEGER NOT NULL REFERENCES locations(id),
  sensei_id INTEGER REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS club_attendees (
  id SERIAL PRIMARY KEY,
  club_session_id INTEGER NOT NULL REFERENCES club_sessions(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  UNIQUE(club_session_id, student_id)
);

CREATE INDEX IF NOT EXISTS club_sessions_location_date_idx ON club_sessions(location_id, session_date DESC);
CREATE INDEX IF NOT EXISTS club_attendees_student_idx ON club_attendees(student_id);

CREATE TABLE IF NOT EXISTS progress_log_comments (
  id SERIAL PRIMARY KEY,
  log_id INTEGER NOT NULL REFERENCES progress_logs(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  user_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS progress_log_comments_log_id_idx ON progress_log_comments(log_id);
