CREATE TABLE IF NOT EXISTS belt_level_projects (
  id SERIAL PRIMARY KEY,
  belt_name TEXT NOT NULL,
  sublevel INTEGER NOT NULL,
  project_name TEXT NOT NULL,
  project_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS belt_level_projects_idx ON belt_level_projects(belt_name, sublevel);
