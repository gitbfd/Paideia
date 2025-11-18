-- Allow students to insert their own enrollments
-- This policy allows authenticated users to enroll themselves in courses

-- Drop policy if it exists (idempotent)
drop policy if exists "enrollments_student_insert" on public.course_enrollments;

create policy "enrollments_student_insert"
  on public.course_enrollments
  for insert
  with check (
    auth.uid() = user_id 
    and role = 'student'
    and exists (
      select 1 from public.courses
      where id = course_id
      and status = 'published'
    )
  );

