-- Stores curriculum modules (grouped by program + optional sub-program)
CREATE TABLE IF NOT EXISTS curriculum_modules (
  id SERIAL PRIMARY KEY,
  program TEXT NOT NULL,
  sub_program TEXT,              -- NULL for programs with no sub-programs (CREATE, AI Academy)
  module_name TEXT NOT NULL,
  module_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS curriculum_modules_program_idx ON curriculum_modules(program, sub_program);

-- Stores individual lessons within a module
CREATE TABLE IF NOT EXISTS curriculum_lessons (
  id SERIAL PRIMARY KEY,
  module_id INTEGER NOT NULL REFERENCES curriculum_modules(id) ON DELETE CASCADE,
  lesson_name TEXT NOT NULL,
  lesson_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS curriculum_lessons_module_idx ON curriculum_lessons(module_id);

-- Deny-all RLS: all DB access goes through the Express server on a role that
-- bypasses RLS; the anon/PostgREST role gets nothing. RESTRICTIVE deny_all for
-- all roles. Idempotent (drop-if-exists before create).
ALTER TABLE curriculum_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_all ON curriculum_modules;
CREATE POLICY deny_all ON curriculum_modules AS RESTRICTIVE FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS deny_all ON curriculum_lessons;
CREATE POLICY deny_all ON curriculum_lessons AS RESTRICTIVE FOR ALL USING (false) WITH CHECK (false);
