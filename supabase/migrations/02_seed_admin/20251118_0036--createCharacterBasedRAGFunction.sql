-- Create RPC function for character-based RAG queries
-- This function queries text_document_chunks filtered by course_text_sections
-- using character position overlap instead of line numbers

CREATE OR REPLACE FUNCTION public.match_text_chunks_for_course(
  p_course_id uuid,
  p_query_embedding vector(768),
  p_match_count int DEFAULT 8,
  p_max_order_index int DEFAULT NULL  -- For Assessment Modules: limit to sections above this
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float4,
  start_char integer,
  end_char integer
)
LANGUAGE sql STABLE AS $$
  WITH course_sections AS (
    SELECT 
      cts.text_document_id,
      cts.start_char,
      cts.end_char
    FROM public.course_text_sections cts
    WHERE cts.course_id = p_course_id
      AND (p_max_order_index IS NULL OR cts.order_index < p_max_order_index)
      -- Only include sections that have character positions set
      AND cts.start_char IS NOT NULL 
      AND cts.end_char IS NOT NULL
  ),
  relevant_chunks AS (
    SELECT 
      tdc.id,
      tdc.content,
      tdc.embedding,
      tdc.start_char,
      tdc.end_char
    FROM public.text_document_chunks tdc
    INNER JOIN course_sections cs 
      ON tdc.document_id = cs.text_document_id
    WHERE 
      -- Chunk overlaps with section: chunk starts before section ends AND chunk ends after section starts
      tdc.start_char < cs.end_char 
      AND tdc.end_char > cs.start_char
      -- Only include chunks that have character positions set
      AND tdc.start_char IS NOT NULL
      AND tdc.end_char IS NOT NULL
  )
  SELECT 
    rc.id,
    rc.content,
    1 - (rc.embedding <=> p_query_embedding) as similarity,
    rc.start_char,
    rc.end_char
  FROM relevant_chunks rc
  ORDER BY rc.embedding <-> p_query_embedding
  LIMIT p_match_count;
$$;

COMMENT ON FUNCTION public.match_text_chunks_for_course IS 
'Matches text document chunks for a course using character-based filtering. 
Filters chunks that overlap with course_text_sections by character position.
Supports limiting to sections above a given order_index for Assessment Modules.';

