-- The notes board gains stages. A note is still a note; what changes is that it
-- now sits in a lane, so the same board that holds reminders can hold the work
-- a center is carrying (cancellations, re-enrollments, print requests) without
-- becoming a second page.
ALTER TABLE public.director_notes
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'todo',
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Same shape as every other controlled value in the schema: a CHECK, not an
-- app-layer promise.
ALTER TABLE public.director_notes
  DROP CONSTRAINT IF EXISTS director_notes_status_check;
ALTER TABLE public.director_notes
  ADD CONSTRAINT director_notes_status_check
  CHECK (status IN ('todo', 'doing', 'done'));

-- sort_order is per lane now, so the board reads a location's notes lane by
-- lane rather than as one list.
CREATE INDEX IF NOT EXISTS director_notes_location_status_idx
  ON public.director_notes (location_id, status, sort_order);
