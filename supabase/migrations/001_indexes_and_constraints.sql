-- Migration: Add missing indexes and NOT NULL constraints
-- Run this in the Supabase SQL editor

-- ── Indexes on frequently queried foreign key columns ──────────────────────────

CREATE INDEX IF NOT EXISTS idx_progress_logs_student_id     ON progress_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_progress_logs_session_date   ON progress_logs(session_date);
CREATE INDEX IF NOT EXISTS idx_daily_assignments_student_id ON daily_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_daily_assignments_date       ON daily_assignments(session_date);
CREATE INDEX IF NOT EXISTS idx_club_attendees_session_id    ON club_attendees(club_session_id);
CREATE INDEX IF NOT EXISTS idx_student_programs_student_id  ON student_programs(student_id);

-- ── NOT NULL on boolean columns that should never be NULL ─────────────────────

ALTER TABLE users              ALTER COLUMN active     SET NOT NULL;
ALTER TABLE students           ALTER COLUMN active     SET NOT NULL;
ALTER TABLE daily_assignments  ALTER COLUMN completed  SET NOT NULL;
