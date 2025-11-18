// src/app/admin/texts/[id]/documents/[documentId]/preview/page.tsx
import { createClientServer } from '@/lib/supabase-server';
import { convertTextToHtml } from '@/lib/text-to-html';
import LineNumberedContent from '@/components/LineNumberedContent';
import { htmlToGridRows } from '@/lib/html-to-grid-rows';
import { generateTextPreviewStyles } from '@/lib/text-preview-styles';
import Link from 'next/link';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ id: string; documentId: string }> }): Promise<Metadata> {
  const supabase = await createClientServer();
  const { documentId } = await params;
  
  const { data: document } = await supabase
    .from('text_documents')
    .select('meta')
    .eq('id', documentId)
    .single();

  const filename = document?.meta?.filename || 'Document';

  return {
    title: filename,
  };
}

export default async function PreviewPage({ params }: { params: Promise<{ id: string; documentId: string }> }) {
  const supabase = await createClientServer();
  const { id, documentId } = await params;

  // Get document info
  const { data: document, error: docError } = await supabase
    .from('text_documents')
    .select('display_content, source_type, meta, text_id, texts(title)')
    .eq('id', documentId)
    .single();

  if (docError || !document) {
    return (
      <main className="p-6">
        <div className="text-red-600">Error: {docError?.message || 'Document not found'}</div>
        <Link href={`/admin/texts/${id}/edit`} className="text-blue-600 hover:underline mt-4 inline-block">
          ← Back to Text
        </Link>
      </main>
    );
  }

  let content: string;
  let isReconstructed = false;

  if (!document.display_content) {
    // Fallback: reconstruct from chunks
    const { data: chunks, error: chunksError } = await supabase
      .from('text_document_chunks')
      .select('content, chunk_index')
      .eq('document_id', documentId)
      .order('chunk_index', { ascending: true });

    if (chunksError || !chunks || chunks.length === 0) {
      return (
        <main className="p-6">
          <div className="text-amber-600 bg-amber-50 p-4 rounded border border-amber-200">
            Display content not available. This document was ingested before the display_content feature was added. Please re-ingest the document to enable preview.
          </div>
          <Link href={`/admin/texts/${id}/edit`} className="text-blue-600 hover:underline mt-4 inline-block">
            ← Back to Text
          </Link>
        </main>
      );
    }

    const reconstructedText = chunks.map(chunk => chunk.content).join('\n\n');
    const sourceType = (document.source_type || 'txt') as 'pdf' | 'txt' | 'markdown' | 'html' | 'other';
    content = await convertTextToHtml(reconstructedText, sourceType);
    isReconstructed = true;
  } else {
    content = document.display_content;
  }

  // Convert HTML to grid rows for the new grid-based layout
  const gridRows = htmlToGridRows(content, 1);

  const textTitle = (document.texts as any)?.title || 'Unknown Text';
  const filename = document.meta?.filename || 'Document';
  const lineCount = gridRows.length;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="sticky top-0 bg-white border-b shadow-sm z-10 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{filename}</h1>
            <div className="text-sm text-gray-600">
              {textTitle} • {content.length.toLocaleString()} characters • {lineCount.toLocaleString()} lines
            </div>
          </div>
          <Link
            href={`/admin/texts/${id}/edit`}
            className="text-blue-600 hover:underline"
          >
            ← Back to Text
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {isReconstructed && (
          <div className="mb-4 text-sm text-amber-600 bg-amber-50 p-3 rounded border border-amber-200">
            ⚠️ This preview is reconstructed from RAG chunks. For better readability, re-ingest this document to generate the full display version.
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <LineNumberedContent gridRows={gridRows} startLine={1} />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: generateTextPreviewStyles() }} />
    </main>
  );
}

