-- ================== SAFETY TOGGLE (default OFF) ==================
-- To allow destructive/reset steps for this run:
-- select set_config('app.destructive_ok', 'on', true);
-- then run the file
-- (optional) turn off again after:
-- select set_config('app.destructive_ok', 'off', true);

select set_config(
  'app.destructive_ok',
  coalesce(current_setting('app.destructive_ok', true), 'off'),
  true
);

create or replace function public._destructive_ok()
returns boolean language sql stable as $$
  select coalesce(current_setting('app.destructive_ok', true), 'off') = 'on'
$$;
-- ================== END SAFETY TOGGLE ==================

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

-- Replace helper to read from app_admins
do $$ begin if public._destructive_ok() then drop function if exists public.is_admin();
 else raise notice 'Skipped: drop function if exists public.is_admin();'; end if; end $$;create or replace function public.is_admin()
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

-- Reset policies (idempotent, guarded)
DO $$
DECLARE
  r record;
BEGIN
  IF public._destructive_ok() THEN
    FOR r IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'notes'
    LOOP
      EXECUTE format('drop policy if exists %I on public.notes;', r.policyname);
    END LOOP;
  ELSE
    RAISE NOTICE 'Skipped policy drops in guarded block for public.notes';
  END IF;
END
$$ LANGUAGE plpgsql;


-- Minimal non-recursive owner policies (+ admin via is_admin if desired later)
create policy "notes_select_own"  on public.notes for select using (auth.uid() = user_id);
create policy "notes_insert_own"  on public.notes for insert with check (auth.uid() = user_id);
create policy "notes_update_own"  on public.notes for update using (auth.uid() = user_id);
create policy "notes_delete_own"  on public.notes for delete using (auth.uid() = user_id);

-- =============================================
-- PROFILES (with admin-minimal requirement)
-- =============================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  role text not null default 'student',
  created_at timestamptz default now(),
  -- app fields used by your UI:
  first_name  text,
  last_name   text,
  street      text,
  city        text,
  state       text,
  phone       text,
  about_me    text,
  avatar_url  text,
  updated_at  timestamptz default now()
);
alter table public.profiles enable row level security;

-- Drop any placeholder defaults (ensure no forced empty strings)
alter table public.profiles
  alter column first_name drop default,
  alter column last_name  drop default,
  alter column street     drop default,
  alter column city       drop default,
  alter column state      drop default,
  alter column phone      drop default,
  alter column about_me   drop default,
  alter column avatar_url drop default;

-- Make optional fields nullable (admins can omit them)
alter table public.profiles
  alter column street drop not null,
  alter column city drop not null,
  alter column state drop not null,
  alter column about_me drop not null,
  alter column avatar_url drop not null;

-- Clean existing '' → NULL for optional fields
update public.profiles
set street     = nullif(street, ''),
    city       = nullif(city, ''),
    state      = nullif(state, ''),
    about_me   = nullif(about_me, ''),
    avatar_url = nullif(avatar_url, '');

-- Enforce admin minimal requirement: first_name, last_name, email, phone must be present for role='admin'
alter table public.profiles
  drop constraint if exists profiles_admin_minimal_req;

alter table public.profiles
  add constraint profiles_admin_minimal_req
  check (
    role <> 'admin'
    OR (
      coalesce(length(trim(first_name)),0) > 0 AND
      coalesce(length(trim(last_name)),0)  > 0 AND
      coalesce(length(trim(email)),0)      > 0 AND
      coalesce(length(trim(phone)),0)      > 0
    )
  );

-- Upsert email on user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created') then
    create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
  end if;
end $$;

-- Reset profiles policies (non-recursive)
do $$ begin if public._destructive_ok() then 
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname='public' and tablename='profiles'
  loop
    execute format('drop policy if exists %I on public.profiles;', r.policyname);
  end loop;
en else raise notice 'Skipped policy drops in guarded block'; end if; end $$;

create policy "profiles_read_own_or_admin"
  on public.profiles
  for select
  using (auth.uid() = id or public.is_admin());

create policy "profiles_insert_self_or_admin"
  on public.profiles
  for insert
  with check (auth.uid() = id or public.is_admin());

create policy "profiles_update_self_or_admin"
  on public.profiles
  for update
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- updated_at trigger
do $$ begin if public._destructive_ok() then drop trigger if exists trg_profiles_updated_at on public.profiles;
 else raise notice 'Skipped: drop trigger if exists trg_profiles_updated_at on public.profiles;'; end if; end $$;create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- =============================================
-- STORAGE: avatars (PUBLIC) + policies
-- =============================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

-- Ensure storage.objects RLS enabled (notice if not)
do $$
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname='storage' and c.relname='objects' and c.relrowsecurity
  ) then
    null;
  else
    raise notice 'RLS not enabled on storage.objects. Run as table owner: ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;';
  end if;
end $$;

-- Clean avatars policies
do $$ begin if public._destructive_ok() then 
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname='storage' and tablename='objects'
  loop
    execute format('drop policy if exists %I on storage.objects;', r.policyname);
  end loop;
en else raise notice 'Skipped policy drops in guarded block'; end if; end $$;

-- Public read of avatar files
create policy "avatars_public_read"
on storage.objects for select
using ( bucket_id = 'avatars' );

-- Authenticated users can insert/update/delete only under their own prefix: avatars/<userId>/*
create policy "avatars_insert_own_prefix"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatars_update_own_prefix"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatars_delete_own_prefix"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- =============================================
-- COURSES + policies
-- =============================================
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz default now()
);
alter table public.courses enable row level security;

-- Reset course policies
do $$ begin if public._destructive_ok() then 
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname='public' and tablename='courses'
  loop
    execute format('drop policy if exists %I on public.courses;', r.policyname);
  end loop;
en else raise notice 'Skipped policy drops in guarded block'; end if; end $$;

-- Extend: slug + lifecycle
alter table public.courses
  add column if not exists slug text,
  add column if not exists status text default 'draft',
  add column if not exists published_at timestamptz,
  add column if not exists updated_at timestamptz default now();

-- Status constraint
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'courses_status_check'
  ) then
    alter table public.courses
      add constraint courses_status_check
      check (status in ('draft','published','archived'));
  end if;
end $$;

-- Backfill slug (idempotent)
with bases as (
  select id,
         nullif(lower(regexp_replace(coalesce(title, ''), '[^a-z0-9]+', '-', 'g')), '') as base
  from public.courses
),
dedup as (
  select id, coalesce(base, 'course') as base,
         row_number() over (partition by base order by id) as rn
  from bases
)
update public.courses c
set slug = case when d.rn = 1 then d.base else d.base || '-' || d.rn end
from dedup d
where c.id = d.id
  and (c.slug is null or c.slug = '');

create unique index if not exists courses_slug_uidx on public.courses (slug);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='courses'
      and column_name='slug' and is_nullable='YES'
  ) then
    alter table public.courses alter column slug set not null;
  end if;
end $$;

-- updated_at trigger
do $$ begin if public._destructive_ok() then drop trigger if exists trg_courses_updated_at on public.courses;
 else raise notice 'Skipped: drop trigger if exists trg_courses_updated_at on public.courses;'; end if; end $$;create trigger trg_courses_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

-- RLS: published visible to all; owner sees own; admins see all. Writes admin-only.
create policy "courses_read_published_or_own_or_admin"
  on public.courses
  for select
  using (
    status = 'published'
    or auth.uid() = user_id
    or public.is_admin()
  );

create policy "courses_admin_write"
  on public.courses
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- =============================================
-- LESSONS (per course) + policies
-- =============================================
create table if not exists public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  body text default '',
  order_index int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.course_lessons enable row level security;

-- Reset lesson policies
do $$ begin if public._destructive_ok() then 
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname='public' and tablename='course_lessons'
  loop
    execute format('drop policy if exists %I on public.course_lessons;', r.policyname);
  end loop;
en else raise notice 'Skipped policy drops in guarded block'; end if; end $$;

-- Read if parent course is published, or owner/admin
create policy "lessons_read"
  on public.course_lessons for select
  using (exists (
    select 1 from public.courses c
    where c.id = course_id
      and (c.status='published' or auth.uid() = c.user_id or public.is_admin())
  ));

-- Write admin-only
create policy "lessons_admin_write"
  on public.course_lessons for all
  using (public.is_admin())
  with check (public.is_admin());

-- updated_at trigger
do $$ begin if public._destructive_ok() then drop trigger if exists trg_lessons_updated_at on public.course_lessons;
 else raise notice 'Skipped: drop trigger if exists trg_lessons_updated_at on public.course_lessons;'; end if; end $$;create trigger trg_lessons_updated_at
before update on public.course_lessons
for each row execute function public.set_updated_at();

-- =============================================
-- RAG: DOCUMENTS + CHUNKS
-- =============================================
create table if not exists public.course_documents (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  source_type text not null check (source_type in ('pdf','txt','html','markdown','other')),
  storage_path text,              -- e.g., 'course-docs/<courseId>/<filename>'
  bytes int,
  mime text,
  meta jsonb default '{}'::jsonb,
  ingest_status text not null default 'uploaded'
    check (ingest_status in ('uploaded','chunked','embedded','error')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.course_documents enable row level security;

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.course_documents(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding vector(1536),
  created_at timestamptz default now()
);
alter table public.document_chunks enable row level security;

-- Indexes
create index if not exists document_chunks_course_idx on public.document_chunks(course_id);
do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='document_chunks_vec_idx'
  ) then
    create index document_chunks_vec_idx
      on public.document_chunks
      using ivfflat (embedding vector_cosine_ops);
  end if;
end $$;

-- Reset RLS: docs + chunks
do $$ begin if public._destructive_ok() then 
declare r record;
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname='public'
      and tablename in ('course_documents','document_chunks')
  loop
    execute format('drop policy if exists %I on public.%I;', r.policyname, r.tablename);
  end loop;
en else raise notice 'Skipped policy drops in guarded block'; end if; end $$;

create policy "docs_read"
  on public.course_documents for select
  using (exists (
    select 1 from public.courses c
    where c.id = course_id
      and (c.status='published' or auth.uid()=c.user_id or public.is_admin())
  ));

create policy "docs_admin_write"
  on public.course_documents for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "chunks_read"
  on public.document_chunks for select
  using (exists (
    select 1 from public.courses c
    where c.id = course_id
      and (c.status='published' or auth.uid()=c.user_id or public.is_admin())
  ));

create policy "chunks_admin_write"
  on public.document_chunks for all
  using (public.is_admin())
  with check (public.is_admin());

-- updated_at for documents
do $$ begin if public._destructive_ok() then drop trigger if exists trg_docs_updated_at on public.course_documents;
 else raise notice 'Skipped: drop trigger if exists trg_docs_updated_at on public.course_documents;'; end if; end $$;create trigger trg_docs_updated_at
before update on public.course_documents
for each row execute function public.set_updated_at();

-- Vector search helper
create or replace function public.match_document_chunks(
  p_course_id uuid,
  p_query_embedding vector(1536),
  p_match_count int default 8
)
returns table (
  id uuid,
  content text,
  similarity float4
)
language sql stable as $$
  select c.id, c.content, 1 - (c.embedding <=> p_query_embedding) as similarity
  from public.document_chunks c
  where c.course_id = p_course_id
  order by c.embedding <-> p_query_embedding
  limit p_match_count;
$$;

-- =============================================
-- ENROLLMENTS (optional now, useful later)
-- =============================================
create table if not exists public.course_enrollments (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  role text not null default 'student' check (role in ('student','instructor')),
  created_at timestamptz default now(),
  primary key (user_id, course_id)
);
alter table public.course_enrollments enable row level security;

-- Reset policies
do $$ begin if public._destructive_ok() then 
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname='public' and tablename='course_enrollments'
  loop
    execute format('drop policy if exists %I on public.course_enrollments;', r.policyname);
  end loop;
en else raise notice 'Skipped policy drops in guarded block'; end if; end $$;

create policy "enrollments_read_self_or_admin"
  on public.course_enrollments for select
  using (auth.uid() = user_id or public.is_admin());

create policy "enrollments_admin_write"
  on public.course_enrollments for all
  using (public.is_admin())
  with check (public.is_admin());

-- =============================================
-- STORAGE: course-docs (PRIVATE) + policies
-- =============================================
insert into storage.buckets (id, name, public)
values ('course-docs', 'course-docs', false)
on conflict (id) do nothing;

-- Clean any existing storage policies targeting course-docs (idempotent)
do $$ begin if public._destructive_ok() then 
declare r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname='storage' and tablename='objects'
      and policyname like 'course_docs_%'
  loop
    execute format('drop policy if exists %I on storage.objects;', r.policyname);
  end loop;
en else raise notice 'Skipped policy drops in guarded block'; end if; end $$;

-- Read allowed if course is published, or owner/admin.
-- Expect path scheme: course-docs/<courseId>/<filename>
create policy "course_docs_read_published_or_own_or_admin"
on storage.objects for select
using (
  bucket_id = 'course-docs'
  and exists (
    select 1
    from public.courses c
    where c.id::text = (storage.foldername(name))[2]
      and (c.status='published' or auth.uid()=c.user_id or public.is_admin())
  )
);

-- Admin-only writes to course-docs
create policy "course_docs_admin_insert"
on storage.objects for insert
to authenticated
with check (bucket_id='course-docs' and public.is_admin());

create policy "course_docs_admin_update"
on storage.objects for update
to authenticated
using (bucket_id='course-docs' and public.is_admin());

create policy "course_docs_admin_delete"
on storage.objects for delete
to authenticated
using (bucket_id='course-docs' and public.is_admin());

-- =============================================
-- DONE. Useful inspections:
-- select policyname, cmd, qual, with_check
-- from pg_policies
-- where schemaname in ('public','storage')
-- order by schemaname, tablename, policyname;
-- =============================================
