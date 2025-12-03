-- Add conversion_content column to store the initial HTML conversion output
ALTER TABLE public.text_documents
ADD COLUMN IF NOT EXISTS conversion_content text;

COMMENT ON COLUMN public.text_documents.conversion_content IS 'Raw HTML generated during ingestion before display formatting';

