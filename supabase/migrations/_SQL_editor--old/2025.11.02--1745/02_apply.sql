-- 02_apply.sql — non-destructive, re-runnable
-- Run this after 01_reset.sql when you change policy names/logic.
-- =============================================
-- Full setup: notes + profiles + admin + storage + courses + lessons + RAG + enrollments
-- Idempotent. Safe to re-run.
-- =============================================

-- ---------- EXTENSIONS ----------
create extension if not exists "pgcrypto";

create extension if not exists "vector";

-- ==========================================================
-- ADMIN SOURCE OF TRUTH: app_admins + is_admin()
-- (table-based admin; replaces any JWT-claim approach)

-- ==========================================================
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- Optional read for debugging
grant select on public.app_admins to authenticated;

-- Seed yourself (edit UUID as needed)
insert into public.app_admins (user_id)
values ('c5f1b4f2-44b7-4c31-95e9-300cb21b9492')
on conflict (user_id) do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.app_admins a
    where a.user_id = auth.uid()
  );

$$;

-- ==========================================================
-- SHARED UTILS
-- ==========================================================
-- One reusable updated_at trigger function
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();

return new;

end $$;

-- =============================================
-- NOTES (student-owned rows)
-- =============================================
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text default '',
  created_at timestamptz default now()
);

alter table public.notes enable row level security;
