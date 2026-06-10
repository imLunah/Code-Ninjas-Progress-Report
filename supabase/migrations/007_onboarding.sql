-- New-staff onboarding walkthrough — admin-authored steps, role-tracked.
-- Run via the Direct connection in the Supabase SQL editor (Transaction pooler can't run DDL).

CREATE TABLE IF NOT EXISTS onboarding_steps (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  body_md TEXT NOT NULL DEFAULT '',
  media JSONB NOT NULL DEFAULT '[]'::jsonb,        -- [{ type:'image'|'video', url }]
  audience TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all','sensei','manager')),
  step_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.onboarding_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_all_onboarding_steps ON public.onboarding_steps AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);
CREATE INDEX IF NOT EXISTS onboarding_steps_order_idx ON onboarding_steps(published, audience, step_order);

-- Per-user marker: NULL = hasn't completed onboarding yet.
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;

-- Backfill: treat all EXISTING staff as already onboarded so only new accounts see the tour.
UPDATE users SET onboarded_at = NOW() WHERE onboarded_at IS NULL;
