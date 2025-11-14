-- helpful for accent stripping
create extension if not exists unaccent;

-- 1) A pure function to slugify text
create or replace function public.slugify(txt text)
returns text
language sql
immutable
as $$
  select coalesce(
    regexp_replace(lower(unaccent(txt)), '[^a-z0-9]+', '-', 'g')
      , ''
  );
$$;

-- 2) Trigger to set slug on INSERT / title changes
create or replace function public.courses_set_slug()
returns trigger
language plpgsql
as $$
declare
  base text;
  s text;
  n integer := 0;
begin
  if (tg_op = 'INSERT' and (new.slug is null or new.slug = ''))
     or (tg_op = 'UPDATE' and new.title is distinct from old.title and (new.slug is null or new.slug = ''))
  then
    base := public.slugify(new.title);
    if base = '' then
      raise exception 'title cannot slugify to empty string';
    end if;

    s := base;
    while exists (select 1 from public.courses where slug = s and id is distinct from new.id) loop
      n := n + 1;
      s := base || '-' || n;
    end loop;

    new.slug := s;
  end if;

  return new;
end
$$;

drop trigger if exists trg_courses_set_slug on public.courses;
create trigger trg_courses_set_slug
before insert or update on public.courses
for each row execute function public.courses_set_slug();

-- 3) Enforce uniqueness at the DB
do $$
begin
  if not exists (select 1 from pg_indexes where schemaname='public' and indexname='courses_slug_unique') then
    create unique index courses_slug_unique on public.courses(slug);
  end if;
end$$;

-- (Optional) backfill existing rows that have null/blank slug
update public.courses
set slug = null
where (slug is null or slug = '');
-- running an UPDATE will re-fire the trigger for rows you change; if you need a full backfill, use:
-- update public.courses set title = title where slug is null or slug = '';
