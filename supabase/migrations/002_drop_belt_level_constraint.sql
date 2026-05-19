-- Migration: Drop belt_level CHECK constraint so custom belt labels can be stored
-- Run this in the Supabase SQL editor (project: hatlannivniuauafptzk.supabase.co)
-- Mirrors what was done for current_project in Session 7.

ALTER TABLE student_programs DROP CONSTRAINT IF EXISTS student_programs_belt_level_check;
