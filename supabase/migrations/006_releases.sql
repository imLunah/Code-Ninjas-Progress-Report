-- Release notes / "What's New" — admin-authored, franchise-wide (not location-scoped).
-- Run via the Direct connection in the Supabase SQL editor (Transaction pooler can't run DDL).

CREATE TABLE IF NOT EXISTS releases (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  version TEXT,
  body_md TEXT NOT NULL DEFAULT '',
  media JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{ type:'image'|'video', url }]
  published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_all_releases ON public.releases AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);
CREATE INDEX IF NOT EXISTS releases_published_idx ON releases(published, published_at DESC);

-- Per-user "seen up to" marker for the auto What's New modal.
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_release_at TIMESTAMPTZ;
