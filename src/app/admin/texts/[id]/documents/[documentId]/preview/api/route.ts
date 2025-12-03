// src/app/admin/texts/[id]/documents/[documentId]/preview/api/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClientForRoute } from '@/lib/supabase/route';
import { convertTextToHtml } from '@/lib/shared';
import { getWrappedHtmlBlockCount } from '@/lib/display/html';

// GET /admin/texts/:id/documents/:documentId/preview/api
// Returns the display_content field which contains the full readable text (not RAG chunks)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  const { supabase, applyCookies } = createClientForRoute(req);
  const { documentId } = await params;

  // Get conversion_content (raw HTML) and rag_text from the document
  const { data: document, error } = await supabase
    .from('text_documents')
    .select('conversion_content, display_content, rag_text')
    .eq('id', documentId)
    .single();

  if (error) {
    return applyCookies(NextResponse.json({ error: error.message }, { status: 400 }));
  }

  if (!document) {
    return applyCookies(NextResponse.json({ error: 'Document not found' }, { status: 404 }));
  }

  // Use conversion_content (raw HTML) as the source, fallback to display_content
  let htmlContent = document.conversion_content || document.display_content;
  
  if (!htmlContent) {
    // Fallback: try to reconstruct from chunks for documents ingested before conversion_content was added
    const { data: docInfo, error: docInfoError } = await supabase
      .from('text_documents')
      .select('source_type')
      .eq('id', documentId)
      .single();

    const { data: chunks, error: chunksError } = await supabase
      .from('text_document_chunks')
      .select('content, chunk_index')
      .eq('document_id', documentId)
      .order('chunk_index', { ascending: true });

    if (chunksError || !chunks || chunks.length === 0) {
      return applyCookies(NextResponse.json({ 
        error: 'Conversion content not available. Please re-ingest the document to enable preview.',
        needsReingest: true
      }, { status: 404 }));
    }

    // Reconstruct from chunks and convert to HTML
    const reconstructedText = chunks.map(chunk => chunk.content).join('\n\n');
    const sourceType = (docInfo?.source_type || 'txt') as 'pdf' | 'txt' | 'markdown' | 'html' | 'other';
    htmlContent = await convertTextToHtml(reconstructedText, sourceType);
  }

  // Count blocks in the HTML content (approximate - based on block elements)
  // Text wraps naturally with CSS, so this is an approximation
  const lineCount = getWrappedHtmlBlockCount(htmlContent);
  
  // Get character count from rag_text (cleaned text source of truth) if available
  const ragTextCharCount = document.rag_text ? document.rag_text.length : null;

  // Calculate block count using block-based grid
  let blockCount: number | null = null;
  if (htmlContent) {
    try {
      const { htmlToBlockGridRowsWithChars } = await import('@/lib/display/html');
      const gridRows = htmlToBlockGridRowsWithChars(htmlContent, document.rag_text || undefined);
      blockCount = gridRows.length;
    } catch (err) {
      console.error('[preview/api] Error calculating block count:', err);
    }
  }

  return applyCookies(NextResponse.json({ 
    content: htmlContent,
    displayContent: htmlContent, // Alias for clarity (this is the raw HTML from conversion)
    ragText: document.rag_text || null, // Include rag_text for processing
    characterCount: htmlContent.length,
    ragTextCharCount: ragTextCharCount, // Character count of cleaned text (for character-based selection)
    lineCount: lineCount,
    blockCount: blockCount // Block count for block-based selection
  }, { status: 200 }));
}

