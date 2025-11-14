-- Slug = first 15 chars of course name, URL-safe, lowercase, spaces→dashes (accents stripped).
-- If that base slug already exists, append -N where N = this course’s ordinal by created_at (1 + number of rows with created_at ≤ this row).
-- Guarantees uniqueness; won’t change on later updates.

-- Helpers
create extension if not exists unaccent;

create or replace function public.slugify_15(txt text)
returns text
language sql
immutable
as $$
  select left(
           regexp_replace(
             regexp_replace(
               lower(unaccent(coalesce(txt,''))),
               '[^a-z0-9]+', '-', 'g'       -- non-alnum -> dash
             ),
             '(^-+|-+$)', '', 'g'           -- trim leading/trailing dashes
           ),
           15                                -- first 15 chars
         );
$$;

-- Ensure created_at default (adjust if your column name differs)
alter table public.courses
  alter column created_at set default now();

-- Trigger function: set slug on INSERT only
create or replace function public.courses_set_short_slug()
returns trigger
language plpgsql
as $$
declare
  base text;
  ord  bigint;
begin
  -- Only generate when slug not provided
  if (tg_op = 'INSERT' and (new.slug is null or new.slug = '')) then
    base := public.slugify_15(new.title);
    if base = '' then
      raise exception 'title slugifies to empty string';
    end if;

    -- Ordinal by creation date (this row’s position)
    ord := 1 + (
      select count(*) from public.courses
      where created_at <= coalesce(new.created_at, now())
    );

    -- Prefer plain base; if taken, append -ord; if still taken (rare), bump ord until unique
    new.slug := base;
    if exists (select 1 from public.courses where slug = new.slug) then
      new.slug := base || '-' || ord::text;
      while exists (select 1 from public.courses where slug = new.slug) loop
        ord := ord + 1;
        new.slug := base || '-' || ord::text;
      end loop;
    end if;
  end if;

  return new;
end
$$;

drop trigger if exists trg_courses_set_short_slug on public.courses;
create trigger trg_courses_set_short_slug
before insert on public.courses
for each row execute function public.courses_set_short_slug();

-- Enforce uniqueness
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname='public' and indexname='courses_slug_unique'
  ) then
    create unique index courses_slug_unique on public.courses(slug);
  end if;
end$$;
