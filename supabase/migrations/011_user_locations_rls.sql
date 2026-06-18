-- 011_user_locations_rls.sql
--
-- Match the deny-all RLS posture of every other public table. All DB access goes
-- through the Express server on a role that bypasses RLS; the anon/PostgREST role
-- gets nothing. RESTRICTIVE deny_all (USING false / WITH CHECK false) for all roles.

ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_all ON public.user_locations AS RESTRICTIVE FOR ALL USING (false) WITH CHECK (false);
