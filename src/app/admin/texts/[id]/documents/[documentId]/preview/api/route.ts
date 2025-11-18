// src/app/admin/texts/[id]/documents/[documentId]/preview/api/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClientForRoute } from '@/lib/supabase-route';
import { convertTextToHtml } from '@/lib/text-to-html';
import { getWrappedHtmlLineCount } from '@/lib/wrap-html';

// GET /admin/texts/:id/documents/:documentId/preview/api
// Returns the display_content field which contains the full readable text (not RAG chunks)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  const { supabase, applyCookies } = createClientForRoute(req);
  const { documentId } = await params;

  // Get display_content from the document (this is the cleaned, readable version)
  const { data: document, error } = await supabase
    .from('text_documents')
    .select('display_content')
    .eq('id', documentId)
    .single();

  if (error) {
    return applyCookies(NextResponse.json({ error: error.message }, { status: 400 }));
  }

  if (!document) {
    return applyCookies(NextResponse.json({ error: 'Document not found' }, { status: 404 }));
  }

  if (!document.display_content) {
    // Fallback: try to reconstruct from chunks for documents ingested before display_content was added
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
        error: 'Display content not available. This document was ingested before the display_content feature was added. Please re-ingest the document to enable preview.',
        needsReingest: true
      }, { status: 404 }));
    }

    // Reconstruct from chunks and convert to HTML
    const reconstructedText = chunks.map(chunk => chunk.content).join('\n\n');
    const sourceType = (docInfo?.source_type || 'txt') as 'pdf' | 'txt' | 'markdown' | 'html' | 'other';
    const reconstructedHtml = await convertTextToHtml(reconstructedText, sourceType);
    
    // Count lines for reconstructed content using the same wrapping logic (uses config from line-wrap-config.ts)
    const lineCount = getWrappedHtmlLineCount(reconstructedHtml);

    return applyCookies(NextResponse.json({ 
      content: reconstructedHtml,
      characterCount: reconstructedHtml.length,
      lineCount: lineCount,
      isReconstructed: true // Flag to indicate this is from chunks, not display_content
    }, { status: 200 }));
  }

  // Count lines in the HTML content using the same wrapping logic (uses config from line-wrap-config.ts)
  const lineCount = getWrappedHtmlLineCount(document.display_content);

  return applyCookies(NextResponse.json({ 
    content: document.display_content,
    characterCount: document.display_content.length,
    lineCount: lineCount
  }, { status: 200 }));
}

