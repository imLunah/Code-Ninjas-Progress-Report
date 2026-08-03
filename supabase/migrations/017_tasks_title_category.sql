-- The task side stops being paper. A sticky is one blob of text, which is all a
-- reminder needs; a task needs a name you can scan a column for, and a kind you
-- can tell at a glance. Both are nullable/defaulted so nothing already pinned
-- on the notes wall has to care.
ALTER TABLE public.director_notes
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'other';

ALTER TABLE public.director_notes
  DROP CONSTRAINT IF EXISTS director_notes_title_check;
ALTER TABLE public.director_notes
  ADD CONSTRAINT director_notes_title_check
  CHECK (title IS NULL OR char_length(title) BETWEEN 1 AND 200);

ALTER TABLE public.director_notes
  DROP CONSTRAINT IF EXISTS director_notes_category_check;
ALTER TABLE public.director_notes
  ADD CONSTRAINT director_notes_category_check
  CHECK (category IN ('cancellation', 'reenrollment', 'print', 'other'));

-- A note on the wall is its body; a task is its title. Neither board can hold a
-- card with nothing on it at all.
ALTER TABLE public.director_notes
  ALTER COLUMN body DROP NOT NULL;

ALTER TABLE public.director_notes
  DROP CONSTRAINT IF EXISTS director_notes_has_content_check;
ALTER TABLE public.director_notes
  ADD CONSTRAINT director_notes_has_content_check
  CHECK (COALESCE(NULLIF(btrim(title), ''), NULLIF(btrim(body), '')) IS NOT NULL);
