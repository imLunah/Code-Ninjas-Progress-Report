-- A task can belong to the center rather than to a director. Plenty of what a
-- board is carrying is the center's job and nobody's in particular, and the
-- honest way to say that is to say it, not to leave the card unassigned and
-- hope everyone reads the silence the same way.
--
-- Three states, one of them new: nobody yet (both empty), the center
-- (assignee_center), a named director (assignee_id). The CHECK is what stops
-- the fourth, meaningless state where a card claims to be both.
ALTER TABLE public.director_tasks
  ADD COLUMN IF NOT EXISTS assignee_center boolean NOT NULL DEFAULT false;

ALTER TABLE public.director_tasks
  DROP CONSTRAINT IF EXISTS director_tasks_assignee_exclusive_check;
ALTER TABLE public.director_tasks
  ADD CONSTRAINT director_tasks_assignee_exclusive_check
  CHECK (NOT (assignee_center AND assignee_id IS NOT NULL));
