-- 009_storage_lockdown.sql
--
-- Lock down Supabase Storage. Previously the anon role (whose key ships in the
-- public client bundle) could INSERT/SELECT/UPDATE/DELETE any object in the
-- profile-pics and club-resources buckets, scoped only by bucket_id. That let
-- anyone with the public key read every student photo, overwrite, or delete all
-- files. All storage access now goes through the Express server using the
-- service_role key (which bypasses RLS), and uploads use one-time signed upload
-- URLs (which are honored regardless of RLS). So every permissive anon/public
-- policy on storage.objects is removed, leaving RLS to deny-all by default.

DROP POLICY IF EXISTS allow_anon_insert_profile_pics ON storage.objects;
DROP POLICY IF EXISTS allow_anon_update_profile_pics ON storage.objects;
DROP POLICY IF EXISTS anon_delete_club_resources     ON storage.objects;
DROP POLICY IF EXISTS anon_delete_profile_pics       ON storage.objects;
DROP POLICY IF EXISTS anon_insert_club_resources     ON storage.objects;
DROP POLICY IF EXISTS anon_insert_profile_pics       ON storage.objects;
DROP POLICY IF EXISTS anon_select_club_resources     ON storage.objects;
DROP POLICY IF EXISTS anon_select_profile_pics       ON storage.objects;
DROP POLICY IF EXISTS anon_update_club_resources     ON storage.objects;
DROP POLICY IF EXISTS anon_update_profile_pics       ON storage.objects;
DROP POLICY IF EXISTS club_resources_anon_delete     ON storage.objects;
DROP POLICY IF EXISTS club_resources_anon_insert     ON storage.objects;
