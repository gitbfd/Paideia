-- Migration: Add character-based RAG support
-- This migration adds character position tracking for RAG chunks and course sections
-- Part of moving from line-based to character-based approach

-- 1. Add rag_text column to text_documents (cleaned text source of truth)
ALTER TABLE public.text_documents
ADD COLUMN IF NOT EXISTS rag_text text;

COMMENT ON COLUMN public.text_documents.rag_text IS 'Cleaned plain text used for RAG ingestion and as source of truth for character positions';

-- 2. Add character position columns to text_document_chunks
ALTER TABLE public.text_document_chunks
ADD COLUMN IF NOT EXISTS start_char integer,
ADD COLUMN IF NOT EXISTS end_char integer;

COMMENT ON COLUMN public.text_document_chunks.start_char IS 'Starting character position in rag_text (0-indexed)';
COMMENT ON COLUMN public.text_document_chunks.end_char IS 'Ending character position in rag_text (exclusive, 0-indexed)';

-- Create index for character range queries
CREATE INDEX IF NOT EXISTS idx_text_document_chunks_char_range 
ON public.text_document_chunks(document_id, start_char, end_char);

-- 3. Add character position columns to course_text_sections
ALTER TABLE public.course_text_sections
ADD COLUMN IF NOT EXISTS start_char integer,
ADD COLUMN IF NOT EXISTS end_char integer;

COMMENT ON COLUMN public.course_text_sections.start_char IS 'Starting character position in rag_text (0-indexed)';
COMMENT ON COLUMN public.course_text_sections.end_char IS 'Ending character position in rag_text (exclusive, 0-indexed)';

-- Create index for character range queries
CREATE INDEX IF NOT EXISTS idx_course_text_sections_char_range 
ON public.course_text_sections(course_id, start_char, end_char);

-- Note: Existing records will have NULL values for these columns
-- They will be populated when documents are re-ingested with the new process

