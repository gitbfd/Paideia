-- 1) Keep/enable RLS and no SELECT policies on app_admins (as above)
alter table public.app_admins enable row level security;

-- 2) Definer-rights helper
create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.app_admins where user_id = uid);
$$;

-- 3) Allow clients to call it
grant execute on function public.is_admin(uuid) to anon, authenticated;

--NOTE reqd middleware change
--const { data: isAdmin, error: rpcErr } = await supabase.rpc('is_admin');