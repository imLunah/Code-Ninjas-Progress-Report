-- 011_user_locations_rls.sql
--
-- Historical migration: originally added the deny-all RLS posture to user_locations.
-- That RLS is now also declared inline in 010 (same migration as the CREATE TABLE),
-- so this file is redundant but kept to preserve applied migration history. Made
-- idempotent (drop-if-exists before create) so a fresh rebuild running 010 then 011
-- does not error on a duplicate policy.

ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_all ON public.user_locations;
CREATE POLICY deny_all ON public.user_locations AS RESTRICTIVE FOR ALL USING (false) WITH CHECK (false);
