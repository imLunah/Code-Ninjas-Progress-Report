-- 010_user_locations.sql
--
-- Multi-center staff assignment. Previously a staff user was bound to exactly one
-- center via users.location_id, and the app blocked writes anywhere but that home
-- center. This join table lets a CD/instructor belong to multiple centers and get
-- full read/write at each. users.location_id stays as the primary/home center
-- (drives the default active location at login); membership = home ∪ these rows.

CREATE TABLE IF NOT EXISTS user_locations (
  user_id     INTEGER NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_user_locations_location ON user_locations (location_id);

-- Backfill: every existing user becomes a member of its current home center.
INSERT INTO user_locations (user_id, location_id)
SELECT id, location_id FROM users WHERE location_id IS NOT NULL
ON CONFLICT DO NOTHING;
