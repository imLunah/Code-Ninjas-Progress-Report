-- 025_mystudio_features.sql
--
-- Per-center switches for the two things a MyStudio connection powers: the
-- booked-today list on the check-in board, and the roster import.
--
-- The app-wide "Experimental features" toggle is per USER and answers "do I want
-- to see in-progress work". These answer a different question, per CENTER: is
-- this particular piece trustworthy enough to leave switched on here. A director
-- who wants the booked list every morning but does not want a roster import
-- available to anyone at their center had no way to say so, and turning the
-- whole integration off to get it is too blunt.
--
-- Both default true, so every existing connection keeps behaving exactly as it
-- did. Off is a deliberate act.
--
-- Enforced on the server, not just hidden in the UI: /today returns nothing when
-- the booked list is off and /import refuses when the import is off, so a stale
-- tab cannot do what a director has switched off.

ALTER TABLE public.mystudio_connections
  ADD COLUMN IF NOT EXISTS feature_booked BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS feature_import BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.mystudio_connections.feature_booked IS
  'Show today''s MyStudio bookings on the check-in board at this center.';
COMMENT ON COLUMN public.mystudio_connections.feature_import IS
  'Allow pulling this center''s roster from MyStudio.';
