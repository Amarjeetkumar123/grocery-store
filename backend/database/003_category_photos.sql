-- Category photos, managed from Admin -> Categories.
-- Run once on a database created before this file existed
-- (Supabase: SQL Editor -> paste -> Run). Safe to run again.

alter table categories add column if not exists image_path text;
