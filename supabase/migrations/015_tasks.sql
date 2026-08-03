-- Center task board. One row per piece of work at a location (cancellations,
-- re-enrollments, print requests and anything else a director is tracking).
-- Category is what kind of work it is; status is how far along it is. Keeping
-- them separate is what stops the board needing a new column every time a new
-- kind of request turns up.
CREATE TABLE IF NOT EXISTS public.tasks (
  id            serial PRIMARY KEY,
  location_id   integer NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  title         text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  body          text CHECK (body IS NULL OR char_length(body) <= 4000),
  status        text NOT NULL DEFAULT 'todo'
                CHECK (status IN ('todo', 'doing', 'done')),
  category      text NOT NULL DEFAULT 'other'
                CHECK (category IN ('cancellation', 'reenrollment', 'print', 'other')),
  -- Cancellations and re-enrollments are about a specific ninja. Null for the
  -- work that isn't, and the task outlives the ninja record if it is removed.
  student_id    integer REFERENCES public.students(id) ON DELETE SET NULL,
  sort_order    integer,
  created_by    integer REFERENCES public.users(id) ON DELETE SET NULL,
  completed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tasks_location_status_idx
  ON public.tasks (location_id, status, sort_order);
CREATE INDEX IF NOT EXISTS tasks_student_idx
  ON public.tasks (student_id);

-- The anon key ships in the client bundle, so RLS is the only thing standing
-- between this table and the public internet. Every read and write goes through
-- the server pool instead.
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_all ON public.tasks AS RESTRICTIVE FOR ALL TO public USING (false);
