-- The section holds two boards now: the plain wall of stickies, and the lanes
-- the center's work moves along. A note belongs to one of them. Keeping them
-- apart is what lets each own its ordering: sort_order on the task board is a
-- position within a lane, on the notes board it is a position on the wall, and
-- one column cannot mean both at once for the same row.
ALTER TABLE public.director_notes
  ADD COLUMN IF NOT EXISTS board text NOT NULL DEFAULT 'notes';

ALTER TABLE public.director_notes
  DROP CONSTRAINT IF EXISTS director_notes_board_check;
ALTER TABLE public.director_notes
  ADD CONSTRAINT director_notes_board_check
  CHECK (board IN ('notes', 'tasks'));

DROP INDEX IF EXISTS public.director_notes_location_status_idx;
CREATE INDEX IF NOT EXISTS director_notes_location_board_idx
  ON public.director_notes (location_id, board, status, sort_order);
