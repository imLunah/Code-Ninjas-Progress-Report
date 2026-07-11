-- 013: Add covering indexes for foreign keys flagged by the Supabase
-- performance advisor (unindexed_foreign_keys). Both tables are low-write
-- (admin-authored announcements + dev-published releases), so the index cost
-- is negligible and joins/deletes on the parent user row stay fast.
--
-- NOTE: the advisor also lists several "unused" indexes (club_*, app_settings,
-- progress_log_comments). Those are intentionally left in place — "unused" only
-- means "not used since the last stats reset" on a young, low-traffic DB; they
-- are cheap to keep and dropping them risks slowing a query that just hasn't
-- run recently. Revisit only if index bloat becomes a real problem.

CREATE INDEX IF NOT EXISTS idx_announcements_created_by
  ON public.announcements (created_by);

CREATE INDEX IF NOT EXISTS idx_releases_created_by
  ON public.releases (created_by);
