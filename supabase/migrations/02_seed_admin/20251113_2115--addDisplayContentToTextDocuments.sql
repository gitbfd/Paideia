-- Add display_content field to text_documents for storing readable text version
-- This is separate from the RAG chunks, which are optimized for vector search

ALTER TABLE public.text_documents
ADD COLUMN IF NOT EXISTS display_content text;

COMMENT ON COLUMN public.text_documents.display_content IS 'Full cleaned text content for display to students, separate from RAG chunks';

