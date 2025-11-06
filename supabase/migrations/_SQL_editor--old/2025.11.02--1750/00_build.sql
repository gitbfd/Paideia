-- 00_build.sql — FROM-ZERO initialization
-- Purpose: Create all schema objects (tables, functions, triggers, policies, indexes) and enable RLS.
-- Usage: Run once on a fresh database. After this, use 02_apply.sql for iterative changes.
-- Notes:
--   • This file intentionally uses plain CREATE/ALTER for readability assuming an empty DB.
--   • If you re-run it against a non-empty DB, you may get 'already exists' errors on policies or other objects.


create extension if not exists "vector";

alter table public.notes enable row level security;
