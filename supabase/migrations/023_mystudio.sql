-- 023_mystudio.sql
--
-- Experimental: pull today's booked class roster from the studio management
-- system the centers already use, so the check-in board starts populated
-- instead of empty.
--
-- One connection per location, not per user. The upstream account is itself
-- scoped to a single center (its company list contains exactly one entry), so
-- a director connecting their account is really connecting their center, and a
-- second director at the same center should inherit it rather than paste again.
--
-- session_cookie is a live credential for a third-party system holding student
-- records and a payment account. It is stored encrypted (AES-256-GCM, key from
-- the MYSTUDIO_ENC_KEY env var), is never returned by any route, and is never
-- logged. RLS below is what keeps it away from the anon key that ships in the
-- client bundle.

CREATE TABLE IF NOT EXISTS public.mystudio_connections (
  id SERIAL PRIMARY KEY,
  location_id INTEGER NOT NULL UNIQUE REFERENCES public.locations(id) ON DELETE CASCADE,
  connected_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  company_id TEXT NOT NULL,
  company_name TEXT,
  session_cookie TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'connected',
  last_verified_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mystudio_connections_status_check CHECK (status IN ('connected', 'expired'))
);

-- Every public table keeps a RESTRICTIVE deny-all policy. The anon key is in
-- the bundle and RLS is the only thing standing in front of this row.
ALTER TABLE public.mystudio_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_all ON public.mystudio_connections;
CREATE POLICY deny_all ON public.mystudio_connections AS RESTRICTIVE FOR ALL USING (false) WITH CHECK (false);

-- FK index, matching the posture of 013_fk_indexes.sql.
CREATE INDEX IF NOT EXISTS idx_mystudio_connections_connected_by
  ON public.mystudio_connections (connected_by);

-- Durable identity for a ninja that has been matched to an upstream participant
-- once, so later syncs stop guessing from names. Nullable: the vast majority of
-- rows will never be matched, and a name match is only promoted to an id after a
-- human has accepted it.
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS mystudio_participant_id TEXT;

-- Lookup is participant_id -> student, so index the column. Partial, because
-- only matched rows are ever searched and most rows are NULL.
CREATE INDEX IF NOT EXISTS idx_students_mystudio_participant_id
  ON public.students (mystudio_participant_id)
  WHERE mystudio_participant_id IS NOT NULL;
