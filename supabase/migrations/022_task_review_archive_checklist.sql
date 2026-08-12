-- Three things a board needs once it holds more than a screenful of cards.

-- 1. A column for work that is finished but waiting on somebody else: a parent
-- to call back, a regional manager to approve, a payment to land. Without it
-- that work sits in In progress pretending to be active, or in Done pretending
-- to be over.
ALTER TABLE public.director_tasks
  DROP CONSTRAINT IF EXISTS director_tasks_column_key_check;
ALTER TABLE public.director_tasks
  ADD CONSTRAINT director_tasks_column_key_check
  CHECK (column_key = ANY (ARRAY['todo'::text, 'doing'::text, 'review'::text, 'done'::text]));

-- 2. Done grows forever otherwise, and a director who deletes to tidy up loses
-- the record of what the center actually did. Archiving takes a card off the
-- board and leaves the row where it is.
ALTER TABLE public.director_tasks
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Every board read now carries `archived_at IS NULL`, so the index does too.
-- The old director_tasks_board_idx stays for the archived listing, which reads
-- the same three columns without the predicate.
CREATE INDEX IF NOT EXISTS director_tasks_board_live_idx
  ON public.director_tasks (location_id, column_key, "position")
  WHERE archived_at IS NULL;

-- 3. A checklist on a card: [{ "text": "...", "done": false }].
--
-- jsonb rather than the child table this repo would normally reach for. That
-- instinct is about cleanup -- a real foreign key is what makes a deleted row
-- take its children with it (see server/lib/reactions.js) -- and a column
-- satisfies it by definition. A checklist item has no identity outside its
-- card, is never queried across cards, and is always read with the card the
-- board already fetches whole, so a child table would buy nothing and cost four
-- endpoints. Shape and size are enforced by the route, the way every other
-- field on this table is.
ALTER TABLE public.director_tasks
  ADD COLUMN IF NOT EXISTS checklist jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.director_tasks
  DROP CONSTRAINT IF EXISTS director_tasks_checklist_check;
ALTER TABLE public.director_tasks
  ADD CONSTRAINT director_tasks_checklist_check
  CHECK (jsonb_typeof(checklist) = 'array' AND jsonb_array_length(checklist) <= 20);
