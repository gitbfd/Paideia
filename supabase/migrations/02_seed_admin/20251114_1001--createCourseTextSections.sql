-- Create course_text_sections table
-- This table links text documents (or specific line ranges from text documents) to courses
-- Allows courses to include specific sections of uploaded texts

CREATE TABLE IF NOT EXISTS public.course_text_sections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  text_document_id uuid NOT NULL,
  start_line integer NOT NULL CHECK (start_line > 0),
  end_line integer NOT NULL CHECK (end_line >= start_line),
  title text, -- Optional title for this section
  order_index integer DEFAULT 0, -- Order within the course
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT course_text_sections_pkey PRIMARY KEY (id),
  CONSTRAINT course_text_sections_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE,
  CONSTRAINT course_text_sections_text_document_id_fkey FOREIGN KEY (text_document_id) REFERENCES public.text_documents(id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_course_text_sections_course_id ON public.course_text_sections(course_id);
CREATE INDEX IF NOT EXISTS idx_course_text_sections_text_document_id ON public.course_text_sections(text_document_id);

-- RLS Policies (admins can do everything)
ALTER TABLE public.course_text_sections ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything
CREATE POLICY "Admins can manage course_text_sections"
  ON public.course_text_sections
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.app_admins
      WHERE app_admins.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.course_text_sections IS 'Links specific line ranges from text documents to courses';
COMMENT ON COLUMN public.course_text_sections.start_line IS 'Starting line number (1-indexed)';
COMMENT ON COLUMN public.course_text_sections.end_line IS 'Ending line number (inclusive)';

