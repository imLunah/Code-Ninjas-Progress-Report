-- 014: Let a permanently deleted staff member's work survive them.
--
-- Before this, a hard delete had to DELETE the person's progress logs and
-- comments, because sensei_id / user_id were NOT NULL and the FKs are NO
-- ACTION. Removing one sensei therefore erased real session history from
-- ninjas' profiles and from the belt-advancement report.
--
-- Dropping NOT NULL lets the delete null the author out instead, so the row
-- stays and the UI labels it "Deleted user". The denormalized user_name on
-- both comment tables is nulled too: keeping it would preserve a removed
-- staff member's name in the database forever, which is exactly what the
-- delete is supposed to get rid of.
--
-- NULL is unambiguous on these three columns because every existing row has
-- an author. It is NOT unambiguous on daily_assignments.sensei_id, where NULL
-- already means "nobody assigned yet", so that column is deliberately left
-- alone and the board keeps showing nothing there.

ALTER TABLE public.progress_logs          ALTER COLUMN sensei_id DROP NOT NULL;

ALTER TABLE public.progress_log_comments  ALTER COLUMN user_id   DROP NOT NULL;
ALTER TABLE public.progress_log_comments  ALTER COLUMN user_name DROP NOT NULL;

ALTER TABLE public.club_session_comments  ALTER COLUMN user_id   DROP NOT NULL;
ALTER TABLE public.club_session_comments  ALTER COLUMN user_name DROP NOT NULL;
