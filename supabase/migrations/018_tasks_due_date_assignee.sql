-- Tasks get a deadline and an owner. Both optional: most of what a center is
-- carrying has neither, and forcing a date on a card nobody has committed to
-- turns every board into a wall of false overdue.
--
-- assignee_id is any active manager or admin who belongs to the center, which
-- the route checks against user_locations. ON DELETE SET NULL so removing a
-- director unassigns their cards rather than deleting the work.
ALTER TABLE public.director_notes
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS assignee_id integer REFERENCES public.users(id) ON DELETE SET NULL;

-- Foreign keys without an index make every delete of the referenced row a
-- sequential scan of this table, same reasoning as migration 013.
CREATE INDEX IF NOT EXISTS director_notes_assignee_idx
  ON public.director_notes (assignee_id);

-- What a director actually reads: what is mine, soonest first.
CREATE INDEX IF NOT EXISTS director_notes_location_due_idx
  ON public.director_notes (location_id, due_date);
