-- A task can be handed to a director. Optional: most of what a center is
-- carrying is nobody's in particular, and a board that insists on an owner
-- gets one typed in at random, which is how a name stops meaning anything.
--
-- assignee_id is any active manager or admin who belongs to the center, which
-- the route checks against user_locations on every write. Without that check
-- the board would be a way to write a row naming any user in the system and
-- read their display name back out of it.
--
-- ON DELETE SET NULL: removing a director unassigns their cards. The work
-- outlives whoever was holding it.
ALTER TABLE public.director_tasks
  ADD COLUMN IF NOT EXISTS assignee_id integer REFERENCES public.users(id) ON DELETE SET NULL;

-- A foreign key with no index makes every delete of a user a sequential scan
-- of this table, same reasoning as migration 013.
CREATE INDEX IF NOT EXISTS director_tasks_assignee_idx
  ON public.director_tasks (assignee_id);
