-- Onboarding switched from an admin-editable CMS to a static Getting Started page.
-- Drop the steps table; keep users.onboarded_at (still used to show the page once to new staff).
-- Run via the Direct connection in the Supabase SQL editor.

DROP TABLE IF EXISTS onboarding_steps;
