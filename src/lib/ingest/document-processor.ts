// src/lib/ingest/document-processor.ts
// Shared document processing pipeline for ingestion

import { createClientAdmin } from '@/lib/supabase/admin';
import { convertTextToHtml } from '@/lib/shared';
import { chunkText, embedText } from '@/lib/rag';
import { htmlToBlockGridRowsWithChars } from '@/lib/display/html';
import type { SourceType, ExtractedContent, IngestOptions, IngestResult } from './types';

export interface ProcessDocumentParams {
  documentId: string;
  textId?: string; // For text_documents
  courseId?: string; // For course_documents
  sourceType: SourceType;
  content: ExtractedContent;
  tableName: 'text_documents' | 'course_documents';
  chunksTableName: 'text_document_chunks' | 'document_chunks';
  options?: IngestOptions;
}

/**
 * Processes extracted content: converts to HTML, stores in DB, chunks, and embeds
 */
export async function processDocument(params: ProcessDocumentParams): Promise<IngestResult> {
  const {
    documentId,
    textId,
    courseId,
    sourceType,
    content,
    tableName,
    chunksTableName,
    options = {},
  } = params;

  const chunkSize = options.chunkSize ?? 2000;
  const overlap = options.overlap ?? 200;
  const admin = createClientAdmin();

  // 1) Convert to HTML for display and store (only for text_documents)
  // course_documents don't have conversion_content, display_content, or rag_text fields
  if (tableName === 'text_documents') {
    console.log('[INGEST] Converting text to HTML for display...');
    const htmlContent = await convertTextToHtml(content.textForDisplay, sourceType);

    // Pre-compute grid rows for fast course page rendering
    console.log('[INGEST] Computing display grid rows...');
    const gridRows = htmlToBlockGridRowsWithChars(htmlContent);
    
    // Store conversion + display content + pre-computed grid rows + RAG text
    console.log('[INGEST] Storing conversion content, display content, grid rows, and RAG text...');
    const { error: displayErr } = await admin
      .from(tableName)
      .update({
        conversion_content: htmlContent,
        display_content: htmlContent,
        display_grid_rows: gridRows,
        rag_text: content.textForRag,
      })
      .eq('id', documentId);
    
    if (displayErr) {
      console.error('[INGEST] Failed to store display content and RAG text:', displayErr);
      throw new Error(`Failed to store content: ${displayErr.message}`);
    }
  } else {
    // For course_documents, we don't store HTML content - just proceed to chunking
    console.log('[INGEST] Processing document (no HTML conversion for course_documents)...');
  }

  // 3) Chunk for RAG (use plain text without HTML tags - embeddings work better with plain text)
  console.log('[INGEST] Chunking text for RAG...');
  const chunks = chunkText(content.textForRag, chunkSize, overlap);
  console.log('[INGEST] Created', chunks.length, 'chunks');

  if (chunks.length === 0) {
    throw new Error('No chunks could be created from the extracted text');
  }

  // 4) (Re)ingest: delete existing chunks, then insert new ones with embeddings and character positions
  console.log('[INGEST] Deleting existing chunks...');
  await admin.from(chunksTableName).delete().eq('document_id', documentId);

  console.log('[INGEST] Processing', chunks.length, 'chunks with embeddings and character positions...');
  let charOffset = 0; // Track character position in rag_text (for text_documents) or content (for course_documents)
  
  for (let i = 0; i < chunks.length; i++) {
    const chunkContent = chunks[i];
    const startChar = charOffset;
    const endChar = charOffset + chunkContent.length;
    
    try {
      console.log(`[INGEST] Embedding chunk ${i + 1}/${chunks.length} (chars ${startChar}-${endChar})...`);
      const vector = await embedText(chunkContent); // number[] length must match pgvector dim
      console.log(`[INGEST] Got embedding vector of length ${vector.length}`);

      console.log(`[INGEST] Inserting chunk ${i + 1} into database...`);
      const chunkData: Record<string, any> = {
        document_id: documentId,
        chunk_index: i,
        content: chunkContent,
        embedding: vector,
      };

      // Add text_id for text_document_chunks
      if (chunksTableName === 'text_document_chunks' && textId) {
        chunkData.text_id = textId;
      }

      // Add course_id for document_chunks
      if (chunksTableName === 'document_chunks' && courseId) {
        chunkData.course_id = courseId;
      }

      // Add character positions for text_document_chunks
      if (chunksTableName === 'text_document_chunks') {
        chunkData.start_char = startChar;
        chunkData.end_char = endChar;
      }

      const { error: insErr } = await admin.from(chunksTableName).insert(chunkData);
      
      if (insErr) {
        console.error(`[INGEST] Database insert error for chunk ${i + 1}:`, insErr);
        throw new Error(`Database insert failed: ${insErr.message}`);
      }
      console.log(`[INGEST] Chunk ${i + 1} inserted successfully`);
      
      // Update character offset for next chunk (account for overlap)
      charOffset = endChar - overlap;
    } catch (embedErr: any) {
      console.error(`[INGEST] Error processing chunk ${i + 1}:`, embedErr);
      throw new Error(
        `Embedding failed: ${embedErr?.message || 'embedText() is not implemented. Please configure your embedding provider.'}`
      );
    }
  }

  // 5) Mark as embedded
  const { error: upErr } = await admin
    .from(tableName)
    .update({ ingest_status: 'embedded' })
    .eq('id', documentId);
  
  if (upErr) {
    throw new Error(`Failed to update ingest status: ${upErr.message}`);
  }

  return {
    success: true,
    chunks: chunks.length,
  };
}

