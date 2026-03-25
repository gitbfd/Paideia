-- Add display_grid_rows to text_documents for pre-computed block-based display
-- Populated on ingest; course page uses this instead of parsing display_content at runtime

ALTER TABLE public.text_documents
ADD COLUMN IF NOT EXISTS display_grid_rows jsonb;

COMMENT ON COLUMN public.text_documents.display_grid_rows IS 'Pre-computed block grid rows (from htmlToBlockGridRowsWithChars) for fast course page rendering. Populated on ingest; run backfill script for existing rows.';
