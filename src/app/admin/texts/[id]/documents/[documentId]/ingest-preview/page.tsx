// src/app/admin/texts/[id]/documents/[documentId]/ingest-preview/page.tsx
import Link from 'next/link';
import type { Metadata } from 'next';
import { createClientServer } from '@/lib/supabase/server';
import '@/styles/text-preview.css';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; documentId: string }>;
}): Promise<Metadata> {
  const supabase = await createClientServer();
  const { documentId } = await params;

  const { data: document } = await supabase
    .from('text_documents')
    .select('meta')
    .eq('id', documentId)
    .single();

  const filename = document?.meta?.filename || 'Document';

  return {
    title: `${filename} • Ingest Preview`,
  };
}

export default async function IngestPreviewPage({
  params,
}: {
  params: Promise<{ id: string; documentId: string }>;
}) {
  const supabase = await createClientServer();
  const { id, documentId } = await params;

  const { data: document, error } = await supabase
    .from('text_documents')
    .select('conversion_content, display_content, meta, source_type, texts(title)')
    .eq('id', documentId)
    .single();

  if (error || !document) {
    return (
      <main className="p-6">
        <div className="text-red-600">Ingest preview unavailable: {error?.message || 'Document not found'}</div>
        <Link href={`/admin/texts/${id}/edit`} className="text-blue-600 hover:underline mt-4 inline-block">
          ← Back to Text
        </Link>
      </main>
    );
  }

  let conversionContent = document.conversion_content;
  const fellBackToDisplay = !conversionContent && !!document.display_content;

  if (!conversionContent && document.display_content) {
    conversionContent = document.display_content;
  }

  if (!conversionContent) {
    return (
      <main className="p-6 space-y-4">
        <div className="text-amber-600 bg-amber-50 p-4 rounded border border-amber-200">
          Ingest HTML not available. Please re-ingest this document to regenerate ingest output.
        </div>
        <Link href={`/admin/texts/${id}/edit`} className="text-blue-600 hover:underline inline-block">
          ← Back to Text
        </Link>
      </main>
    );
  }

  const filename = document.meta?.filename || 'Document';
  const textTitle = (document.texts as { title?: string } | null)?.title || 'Unknown Text';

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="sticky top-0 bg-white border-b shadow-sm z-10 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{filename} • Ingest Preview</h1>
            <div className="text-sm text-gray-700">
              {textTitle} • {conversionContent.length.toLocaleString()} characters • Source: {document.source_type}
            </div>
          </div>
          <Link href={`/admin/texts/${id}/edit`} className="text-blue-600 hover:underline">
            ← Back to Text
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-4">
        <div className="text-sm text-gray-600">
          Rendered HTML output from the converter. This is exactly what was generated during ingestion, before any display formatting.
        </div>
        {fellBackToDisplay && (
          <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 p-2 rounded">
            Ingest HTML was not stored for this document. Showing the display version instead.
          </div>
        )}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div 
            className="p-6 font-serif leading-relaxed text-preview-content max-w-none"
            dangerouslySetInnerHTML={{ __html: conversionContent }}
          />
        </div>
      </div>
    </main>
  );
}

