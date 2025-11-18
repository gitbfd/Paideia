-- Allow public read access to text_documents.display_content for published courses
-- This allows students to see the actual text content included in published courses

-- Add a policy that allows reading text_documents if they are included in a published course
CREATE POLICY "text_documents_read_for_published_courses"
  ON public.text_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.course_text_sections cts
      INNER JOIN public.courses c ON c.id = cts.course_id
      WHERE cts.text_document_id = text_documents.id
        AND c.status = 'published'
    )
    OR public.is_admin()
  );

