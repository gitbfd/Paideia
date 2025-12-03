-- Make start_line and end_line nullable in course_text_sections
-- This allows character-based sections without requiring line numbers
-- Line numbers are now optional (for backward compatibility)

ALTER TABLE public.course_text_sections
ALTER COLUMN start_line DROP NOT NULL,
ALTER COLUMN end_line DROP NOT NULL;

-- Update the check constraint to allow null values
ALTER TABLE public.course_text_sections
DROP CONSTRAINT IF EXISTS course_text_sections_start_line_check,
DROP CONSTRAINT IF EXISTS course_text_sections_end_line_check;

-- Add new constraints that allow null or positive values
ALTER TABLE public.course_text_sections
ADD CONSTRAINT course_text_sections_start_line_check 
  CHECK (start_line IS NULL OR start_line > 0);

ALTER TABLE public.course_text_sections
ADD CONSTRAINT course_text_sections_end_line_check 
  CHECK (end_line IS NULL OR (end_line >= COALESCE(start_line, 0)));

COMMENT ON COLUMN public.course_text_sections.start_line IS 'Starting line number (1-indexed, optional for character-based sections)';
COMMENT ON COLUMN public.course_text_sections.end_line IS 'Ending line number (inclusive, optional for character-based sections)';

