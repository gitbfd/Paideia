-- Promote your user to admin (current approach = profiles.role)
-- Your schema’s default is student, so you must flip it:

-- 1) Find your user id (the auth.users id) - NOTE: `limit 10` just shows the most recent users
select id, email from auth.users order by created_at desc limit 10;

-- 2) Ensure there is a matching profiles row (create if missing)
insert into public.profiles (id, email, role)
values ('c5f1b4f2-44b7-4c31-95e9-300cb21b9492', 'brendan.farrell.duffy@gmail.com', 'admin')
on conflict (id) do update set role = 'admin', email = excluded.email;

-- 3) Verify
select id, email, role from public.profiles where id = 'c5f1b4f2-44b7-4c31-95e9-300cb21b9492';
