-- The kinds a task can be, taken from the Operations Tracker rather than
-- invented: Follow up, Resume from hold, Cancel, Submit invoice. Those are the
-- words the work is already called, and a board that renames them is a board
-- people have to translate.
ALTER TABLE public.director_notes
  DROP CONSTRAINT IF EXISTS director_notes_category_check;

UPDATE public.director_notes SET category = 'cancel' WHERE category = 'cancellation';
UPDATE public.director_notes SET category = 'resume_hold' WHERE category = 'reenrollment';

ALTER TABLE public.director_notes
  ADD CONSTRAINT director_notes_category_check
  CHECK (category IN ('follow_up', 'resume_hold', 'cancel', 'submit_invoice', 'print', 'other'));

-- The tracker's Name column is a ninja. A cancellation one click from the
-- record it concerns is the whole reason a task knows about ninjas.
-- ON DELETE SET NULL: removing a ninja must not delete the work about them.
ALTER TABLE public.director_notes
  ADD COLUMN IF NOT EXISTS student_id integer REFERENCES public.students(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS director_notes_student_idx
  ON public.director_notes (student_id);

-- Invoicing is a billing claim with a due date attached, not a task with extra
-- notes: eight of these fields exist only for invoice rows, which is why most
-- of the spreadsheet is blank. Kept 1:1 alongside instead of bolted on, so a
-- follow-up card never carries eight empty columns.
--
-- program is free text here on purpose. The Regional Center's names for
-- programs ("Create Regular") are not DojoLink's controlled program list, and
-- forcing them through it would either reject real invoices or corrupt the
-- list every other CHECK depends on.
CREATE TABLE IF NOT EXISTS public.task_invoices (
  task_id             integer PRIMARY KEY REFERENCES public.director_notes(id) ON DELETE CASCADE,
  rc_name             text CHECK (rc_name IS NULL OR char_length(rc_name) <= 120),
  payment_processor   text CHECK (payment_processor IS NULL OR char_length(payment_processor) <= 120),
  service_coordinator text CHECK (service_coordinator IS NULL OR char_length(service_coordinator) <= 120),
  program             text CHECK (program IS NULL OR char_length(program) <= 100),
  service_month       smallint CHECK (service_month IS NULL OR service_month BETWEEN 1 AND 12),
  service_year        smallint CHECK (service_year IS NULL OR service_year BETWEEN 2000 AND 2100),
  order_received      date,
  amount              numeric(10, 2) CHECK (amount IS NULL OR amount >= 0)
);

-- The anon key ships in the client bundle, so RLS is the only thing standing
-- between this table and the public internet.
ALTER TABLE public.task_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_all ON public.task_invoices AS RESTRICTIVE FOR ALL TO public USING (false);
