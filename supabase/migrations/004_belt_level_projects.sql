CREATE TABLE IF NOT EXISTS belt_level_projects (
  id SERIAL PRIMARY KEY,
  belt_name TEXT NOT NULL,
  sublevel INTEGER NOT NULL,
  project_name TEXT NOT NULL,
  project_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS belt_level_projects_idx ON belt_level_projects(belt_name, sublevel);

-- Deny-all RLS: all DB access goes through the Express server on a role that
-- bypasses RLS; the anon/PostgREST role gets nothing. RESTRICTIVE deny_all for
-- all roles. Idempotent (drop-if-exists before create).
ALTER TABLE belt_level_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_all ON belt_level_projects;
CREATE POLICY deny_all ON belt_level_projects AS RESTRICTIVE FOR ALL USING (false) WITH CHECK (false);
