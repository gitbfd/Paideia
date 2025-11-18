-- Allow public read access to course_text_sections for published courses
-- This allows students to see which texts are included in published courses

-- Add a policy that allows reading course_text_sections if the parent course is published
CREATE POLICY "course_text_sections_read_published"
  ON public.course_text_sections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_text_sections.course_id
        AND courses.status = 'published'
    )
    OR public.is_admin()
  );

