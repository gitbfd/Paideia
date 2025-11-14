--Ensure courses.slug has a UNIQUE index (done in Option B).
--If you have RLS on courses, confirm your admin insert policy allows insert when is_admin() is true, e.g.:
create policy courses_admin_write
on public.courses
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
