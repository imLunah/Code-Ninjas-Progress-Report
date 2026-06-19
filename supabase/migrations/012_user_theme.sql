-- 012_user_theme.sql
--
-- Per-account theme preferences so dark/light mode and the custom accent follow
-- a user across devices instead of living only in each device's localStorage.
-- NULL = no saved preference yet (fall back to the device's local/default theme).

ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_mode   TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_accent TEXT;
