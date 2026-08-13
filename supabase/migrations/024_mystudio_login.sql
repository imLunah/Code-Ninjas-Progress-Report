-- 024_mystudio_login.sql
--
-- Lets a director sign into MyStudio from inside DojoLink instead of taking a
-- trip through devtools to copy a cookie out of a network request.
--
-- The reason this is worth doing: the pasted session turned out to last hours,
-- not the month it was designed around. The first connection was made at 08:23
-- and was dead before 19:00 the same day. A devtools paste once a month is a
-- chore; once a day is a feature nobody will keep using.
--
-- MyStudio emails a six digit code at every sign-in, so this can never be fully
-- unattended. Storing the password is what reduces a renewal to typing those six
-- digits: DojoLink asks MyStudio to send the code and completes the exchange
-- itself. Without it the director re-types an email and password every time.
--
-- login_secret is a franchise credential for a system holding student records
-- and a payment account, so it gets exactly the treatment session_cookie gets:
-- AES-256-GCM under MYSTUDIO_ENC_KEY, never returned by any route, never logged,
-- and behind the RESTRICTIVE deny_all policy already on this table. It is
-- written only after the credential has been proven to work, so a typo is never
-- stored. Nulling these three columns is offered in the UI and is the whole of
-- "forget my password".
--
-- No new table, so no new RLS policy is needed: deny_all from 023 covers every
-- column added here.

ALTER TABLE public.mystudio_connections
  ADD COLUMN IF NOT EXISTS login_email    TEXT,
  ADD COLUMN IF NOT EXISTS login_secret   TEXT,
  ADD COLUMN IF NOT EXISTS login_saved_at TIMESTAMPTZ;

COMMENT ON COLUMN public.mystudio_connections.login_email IS
  'MyStudio sign-in address. Shown back to the director so they know which account is connected.';
COMMENT ON COLUMN public.mystudio_connections.login_secret IS
  'MyStudio password, AES-256-GCM under MYSTUDIO_ENC_KEY. Never returned by a route, never logged.';
COMMENT ON COLUMN public.mystudio_connections.login_saved_at IS
  'When the password was last stored. NULL means no saved password and a renewal needs it typed again.';
