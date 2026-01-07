-- Add block number columns to course_text_sections
-- These store the original block numbers entered by admins when creating sections
-- Block numbers are converted to character ranges for RAG queries, but we preserve
-- the original block numbers for display purposes

ALTER TABLE public.course_text_sections
ADD COLUMN IF NOT EXISTS start_block integer,
ADD COLUMN IF NOT EXISTS end_block integer;

COMMENT ON COLUMN public.course_text_sections.start_block IS 'Starting block number (1-indexed, original value entered by admin)';
COMMENT ON COLUMN public.course_text_sections.end_block IS 'Ending block number (inclusive, original value entered by admin)';

-- Add check constraint to ensure block numbers are valid
ALTER TABLE public.course_text_sections
ADD CONSTRAINT course_text_sections_start_block_check 
  CHECK (start_block IS NULL OR start_block > 0);

ALTER TABLE public.course_text_sections
ADD CONSTRAINT course_text_sections_end_block_check 
  CHECK (end_block IS NULL OR (end_block >= COALESCE(start_block, 0)));

