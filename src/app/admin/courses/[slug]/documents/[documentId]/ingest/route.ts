// api/admin/courses/[slug]/documents/[documentId]/ingest/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { createClientAdmin } from '@/lib/supabase-admin';
import { normalizeText } from '@/lib/text-cleaner';
import { chunkText } from '@/lib/chunker';
import { embedText } from '@/lib/embeddings';
// Import polyfills first, before any pdf-parse related code
import '@/lib/pdf-polyfills';

// Ensure this route can handle long-running requests
export const maxDuration = 300; // 5 minutes for large file processing

export async function POST(_req: NextRequest, { params }: { params: Promise<{ slug: string; documentId: string }> }) {
  try {
    console.log('[INGEST] Starting ingestion process');
    const admin = createClientAdmin();
    const { documentId } = await params;
    console.log('[INGEST] Document ID:', documentId);

    // 1) Load doc row (to get storage path & type)
    const { data: doc, error: docErr } = await admin
      .from('course_documents')
      .select('id, course_id, storage_path, source_type')
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

    // 3) Extract text based on file type
    let raw: string;
    try {
      if (doc.source_type === 'pdf') {
        // Use pdf2json for server-side PDF parsing (no worker required)
        const { createRequire } = await import('module');
        const require = createRequire(import.meta.url);
        const PDFParser = require('pdf2json');
        
        // Convert Blob to Buffer
        const arrayBuffer = await fileData.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        try {
          // Create parser instance (no arguments needed for basic usage)
          const pdfParser = new PDFParser();
          
          // Parse PDF using promise-based API
          const pdfData = await new Promise<any>((resolve, reject) => {
            pdfParser.on('pdfParser_dataError', (err: any) => {
              reject(new Error(`PDF parsing error: ${err.parserError || err.message || 'Unknown error'}`));
            });
            
            pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
              resolve(pdfData);
            });
            
            // Parse PDF buffer - pdf2json's parseBuffer accepts Buffer directly
            pdfParser.parseBuffer(buffer);
          });
          
          // Extract text from all pages
          const textParts: string[] = [];
          if (pdfData.Pages && Array.isArray(pdfData.Pages)) {
            for (const page of pdfData.Pages) {
              if (page.Texts && Array.isArray(page.Texts)) {
                for (const textItem of page.Texts) {
                  if (textItem.R && Array.isArray(textItem.R)) {
                    for (const run of textItem.R) {
                      if (run.T) {
                        // Decode URI component if needed (pdf2json encodes text)
                        try {
                          textParts.push(decodeURIComponent(run.T));
                        } catch {
                          textParts.push(run.T);
                        }
                      }
                    }
                  }
                }
              }
            }
          }
          
          raw = textParts.join(' ');
          
          if (!raw || raw.trim().length === 0) {
            throw new Error('No text could be extracted from PDF');
          }
        } catch (parseErr: any) {
          console.error('[INGEST] PDF parsing failed:', parseErr);
          throw new Error(`PDF text extraction failed: ${parseErr.message}`);
        }
      } else if (doc.source_type === 'txt' || doc.source_type === 'markdown' || doc.source_type === 'html') {
        // For text files, markdown, and HTML - read as text
        raw = await fileData.text();
      } else {
        // For 'other' types, try to read as text (fallback)
        raw = await fileData.text();
      }
    } catch (extractErr: any) {
      return NextResponse.json({ error: `Text extraction failed: ${extractErr?.message ?? 'Unknown error'}` }, { status: 400 });
    }

    if (!raw || raw.trim().length === 0) {
      return NextResponse.json({ error: 'No text could be extracted from the document' }, { status: 400 });
    }

    // 4) Clean + chunk
    console.log('[INGEST] Cleaning and chunking text...');
    const cleaned = normalizeText(raw);
    const chunks = chunkText(cleaned, 2000, 200);
    console.log('[INGEST] Created', chunks.length, 'chunks');

    if (chunks.length === 0) {
      return NextResponse.json({ error: 'No chunks could be created from the extracted text' }, { status: 400 });
    }

    // 5) (Re)ingest: delete existing chunks, then insert new ones with embeddings
    console.log('[INGEST] Deleting existing chunks...');
    await admin.from('document_chunks').delete().eq('document_id', doc.id);

    console.log('[INGEST] Processing', chunks.length, 'chunks with embeddings...');
    for (let i = 0; i < chunks.length; i++) {
      const content = chunks[i];
      try {
        console.log(`[INGEST] Embedding chunk ${i + 1}/${chunks.length}...`);
        // ⚠️ implement embedText() for your provider
        const vector = await embedText(content); // number[] length must match pgvector dim
        console.log(`[INGEST] Got embedding vector of length ${vector.length}`);

        console.log(`[INGEST] Inserting chunk ${i + 1} into database...`);
        const { error: insErr } = await admin.from('document_chunks').insert({
          document_id: doc.id,
          course_id: doc.course_id,
          chunk_index: i,
          content,
          embedding: vector,
        });
        if (insErr) {
          console.error(`[INGEST] Database insert error for chunk ${i + 1}:`, insErr);
          return NextResponse.json({ error: insErr.message }, { status: 400 });
        }
        console.log(`[INGEST] Chunk ${i + 1} inserted successfully`);
      } catch (embedErr: any) {
        console.error(`[INGEST] Error processing chunk ${i + 1}:`, embedErr);
        return NextResponse.json({ 
          error: `Embedding failed: ${embedErr?.message || 'embedText() is not implemented. Please configure your embedding provider.'}` 
        }, { status: 500 });
      }
    }

    // 6) Mark as embedded
    const { error: upErr } = await admin
      .from('course_documents')
      .update({ ingest_status: 'embedded' })
      .eq('id', doc.id);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

    return NextResponse.json({ success: true, chunks: chunks.length }, { status: 200 });
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
