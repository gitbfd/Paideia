// src/app/admin/texts/[id]/documents/[documentId]/rag/page.tsx
import { createClientServer } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Metadata } from 'next';
import '@/styles/text-preview.css'; // Import the shared stylesheet

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
    title: `${filename} • RAG Preview`,
  };
}

export default async function RagPreviewPage({ params }: { params: Promise<{ id: string; documentId: string }> }) {
  const supabase = await createClientServer();
  const { id, documentId } = await params;

  // Load document info for header
  const { data: document, error: docError } = await supabase
    .from('text_documents')
    .select('meta, texts(title)')
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

  // Fetch RAG chunks
  const { data: chunks, error: chunksError } = await supabase
    .from('text_document_chunks')
    .select('chunk_index, content, start_char, end_char')
    .eq('document_id', documentId)
    .order('chunk_index', { ascending: true });

  if (chunksError || !chunks) {
    return (
      <main className="p-6">
        <div className="text-red-600">Error loading RAG data: {chunksError?.message || 'Unknown error'}</div>
        <Link href={`/admin/texts/${id}/edit`} className="text-blue-600 hover:underline mt-4 inline-block">
          ← Back to Text
        </Link>
      </main>
    );
  }

  const filename = document.meta?.filename || 'Document';
  const textTitle = (document.texts as any)?.title || 'Unknown Text';
  const totalChars = chunks.reduce((sum, chunk) => sum + (chunk.content?.length ?? 0), 0);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="sticky top-0 bg-white border-b shadow-sm z-10 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{filename} • RAG Preview</h1>
            <div className="text-sm text-gray-700">
              {textTitle} • {chunks.length.toLocaleString()} chunks • {totalChars.toLocaleString()} characters
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

      <div className="max-w-5xl mx-auto p-6 space-y-4">
        {chunks.length === 0 && (
          <div className="bg-white border rounded p-4 text-gray-500">
            No RAG chunks available. Please re-ingest this document.
          </div>
        )}

        {chunks.map((chunk) => {
          const chunkCharCount = chunk.content?.length ?? 0;
          const startChar = chunk.start_char ?? 0;
          const endChar = chunk.end_char ?? (startChar + chunkCharCount);

          return (
            <div key={chunk.chunk_index} className="bg-white border rounded p-4 shadow-sm">
              <div className="text-sm font-medium text-gray-600 mb-2">
                Chunk {chunk.chunk_index + 1} • Chars {startChar.toLocaleString()} – {endChar.toLocaleString()} ({chunkCharCount.toLocaleString()} chars)
              </div>
              <pre className="whitespace-pre-wrap font-serif leading-relaxed text-gray-900">
                {chunk.content}
              </pre>
            </div>
          );
        })}
      </div>
    </main>
  );
}


