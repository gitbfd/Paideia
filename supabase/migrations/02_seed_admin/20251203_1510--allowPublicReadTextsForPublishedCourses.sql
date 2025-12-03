-- Allow public read access to texts metadata (title, author) for published courses
-- This allows students to see the text title and author when viewing published courses
-- This is necessary because texts are referenced through text_documents in course sections

-- Add a policy that allows reading texts if they are included in a published course
CREATE POLICY "texts_read_for_published_courses"
  ON public.texts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.text_documents td
      INNER JOIN public.course_text_sections cts ON cts.text_document_id = td.id
      INNER JOIN public.courses c ON c.id = cts.course_id
      WHERE td.text_id = texts.id
        AND c.status = 'published'
    )
    OR public.is_admin()
  );

