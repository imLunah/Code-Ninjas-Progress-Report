-- 026_center_codes.sql
--
-- A short code per center, which a parent gives along with their email to sign
-- in.
--
-- What this is actually for. Parent sign-in matched an email against every
-- student row in the database, so an address alone reached whichever center it
-- happened to belong to, and a parent with children at two centers saw both at
-- once with no way to say which they meant. The code scopes the question: an
-- email is now only meaningful together with the center it belongs to.
--
-- What it is NOT. A code shared with every parent at a center ends up on a
-- flyer and in a group chat, so it is not a secret and not a second factor.
-- What it buys is that a leaked or guessed address is useless without knowing
-- which center it belongs to, and that one center's parents cannot probe
-- another's. Worth having, worth not overstating.
--
-- Stored uppercase and compared uppercase, because it will be read aloud on the
-- phone and typed by somebody who does not know whether it is case sensitive.
-- Ten characters, letters and digits, which is what a director was asked for.

ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS center_code TEXT;

-- The existing three, so nobody is locked out the moment this deploys. Generated
-- from an alphabet with the misread pairs removed: no I/1, O/0, S/5 or Z/2.
UPDATE public.locations SET center_code = 'HMP3TG' WHERE slug = 'yorba-linda' AND center_code IS NULL;
UPDATE public.locations SET center_code = 'KX9H9H' WHERE slug = 'fullerton'   AND center_code IS NULL;
UPDATE public.locations SET center_code = 'TAT7EU' WHERE slug = 'cerritos'    AND center_code IS NULL;

-- Anything else that exists gets one rather than being left unreachable.
UPDATE public.locations
   SET center_code = UPPER(LEFT(REGEXP_REPLACE(slug, '[^a-zA-Z0-9]', '', 'g'), 6))
 WHERE center_code IS NULL;

ALTER TABLE public.locations
  ADD CONSTRAINT locations_center_code_format
  CHECK (center_code ~ '^[A-Z0-9]{1,10}$');

-- Case-insensitive uniqueness, since the column is already uppercase and the
-- comparison will be too. Two centers sharing a code would silently send a
-- parent to the wrong one.
CREATE UNIQUE INDEX IF NOT EXISTS locations_center_code_key
  ON public.locations (center_code);

ALTER TABLE public.locations ALTER COLUMN center_code SET NOT NULL;

COMMENT ON COLUMN public.locations.center_code IS
  'Short code a parent enters with their email to sign in. Uppercase, letters and digits, max 10. Scoping, not a secret.';
