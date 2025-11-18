
-- Optional helper SQL to create a 'profiles' table and an 'avatars' storage bucket in Supabase.
-- Run in the Supabase SQL editor if you don't already have these.

-- 1) Profiles table keyed by auth.user.id
create table if not exists public.profiles (
  id uuid primary key,                  -- should match auth.users.id
  first_name text,
  last_name text,
  street text,
  city text,
  state text,
  email text,
  phone text,
  about_me text,
  avatar_url text,
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies: owner can select/insert/update own row
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_upsert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- 2) Storage bucket for avatars (public for demo)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;
