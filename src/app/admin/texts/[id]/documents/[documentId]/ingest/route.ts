// api/admin/texts/[id]/documents/[documentId]/ingest/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createClientAdmin } from '@/lib/supabase/admin';
import { extractContent } from '@/lib/ingest/extractors';
import { processDocument } from '@/lib/ingest/document-processor';

// Ensure this route can handle long-running requests
export const maxDuration = 300; // 5 minutes for large file processing

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  try {
    console.log('[INGEST] Starting ingestion process');
    const admin = createClientAdmin();
    const { documentId } = await params;
    console.log('[INGEST] Document ID:', documentId);

    // 1) Load doc row (to get storage path & type)
    const { data: doc, error: docErr } = await admin
      .from('text_documents')
      .select('id, text_id, storage_path, source_type')
      .eq('id', documentId)
      .single();

    if (docErr || !doc) {
      console.error('[INGEST] Document not found:', docErr);
      return NextResponse.json({ error: docErr?.message ?? 'Document not found' }, { status: 404 });
    }
    console.log('[INGEST] Document loaded:', doc.source_type);

    // 2) Download file from storage (private bucket)
    console.log('[INGEST] Downloading file from storage...');
    const { data: fileData, error: dlErr } = await admin.storage.from('course-docs').download(doc.storage_path!);
    if (dlErr || !fileData) {
      console.error('[INGEST] Download failed:', dlErr);
      return NextResponse.json({ error: dlErr?.message ?? 'Download failed' }, { status: 400 });
    }
    console.log('[INGEST] File downloaded successfully');

    // 3) Extract content based on file type
    console.log('[INGEST] Extracting content...');
    let content;
    try {
      content = await extractContent(fileData, doc.source_type);
    } catch (extractErr: any) {
      console.error('[INGEST] Content extraction failed:', extractErr);
      return NextResponse.json({ error: `Text extraction failed: ${extractErr?.message ?? 'Unknown error'}` }, { status: 400 });
    }

    // 4) Process document (convert to HTML, store, chunk, embed)
    console.log('[INGEST] Processing document...');
    const result = await processDocument({
      documentId: doc.id,
      textId: doc.text_id,
      sourceType: doc.source_type,
      content,
      tableName: 'text_documents',
      chunksTableName: 'text_document_chunks',
    });

    revalidateTag(`text-document-${documentId}`, 'max');
    return NextResponse.json({ success: true, chunks: result.chunks }, { status: 200 });
  } catch (error: any) {
    // Catch any unhandled errors and return JSON
    console.error('Ingest route error:', error);
    console.error('Error stack:', error?.stack);
    return NextResponse.json({
      error: error?.message || 'An unexpected error occurred during ingestion',
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    }, { status: 500 });
  }
}

