-- 1) Drop the parameterized overload so there's no ambiguity
drop function if exists public.is_admin(uuid);
-- Some tools record argument names; this covers that case too:
drop function if exists public.is_admin(uid uuid);

-- 2) Recreate a clean zero-arg, definer-rights helper
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid());
$$;

-- 3) Permissions
grant usage on schema public to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
