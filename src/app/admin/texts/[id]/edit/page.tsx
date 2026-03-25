// src/app/admin/texts/[id]/edit/page.tsx
import Link from 'next/link';
import { createClientServer } from '@/lib/supabase/server';
import TextUploader from '@/components/TextUploader';
import TextEditForm from '@/components/TextEditForm';
import DisplayPreviewLink from '@/components/DisplayPreviewLink';
import RagPreviewLink from '@/components/RagPreviewLink';
import DeleteDocumentButton from '@/components/DeleteDocumentButton';
import DocumentEmbeddedStats from '@/components/DocumentEmbeddedStats';
import IngestPreviewLink from '@/components/IngestPreviewLink';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const supabase = await createClientServer();
  const { id } = await params;
  
  const { data: text } = await supabase
    .from('texts')
    .select('title')
    .eq('id', id)
    .single();

  return {
    title: text ? `Edit Text: ${text.title}` : 'Edit Text',
  };
}

export default async function EditText({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClientServer();
  const { id } = await params;

  const { data: text, error } = await supabase
    .from('texts')
    .select('id, title, publication_date, author, translator, tags')
    .eq('id', id)
    .single();

  if (error) {
    return <div className="p-6 text-red-600">Error: {error.message}</div>;
  }
  if (!text) {
    return <div className="p-6">Text not found.</div>;
  }

  // Get list of documents for this text
  const { data: documents } = await supabase
    .from('text_documents')
    .select(
      `
        id,
        source_type,
        ingest_status,
        created_at,
        meta,
        texts (
          title,
          author
        )
      `
    )
    .eq('text_id', id)
    .order('created_at', { ascending: false });

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Edit Text: {text.title}</h1>
        <Link className="text-blue-600 hover:underline" href="/admin/texts">← Back to Texts</Link>
      </div>

      <TextEditForm text={text} />

      <div className="border-t pt-6">
        <h2 className="text-lg font-semibold mb-4">Upload Documents</h2>
        <TextUploader textId={text.id} />
      </div>

      {documents && documents.length > 0 && (
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4">Uploaded Documents</h2>
          <ul className="space-y-4">
            {documents.map((doc) => {
              const relatedText = (doc as any).texts as { title?: string | null; author?: string | null } | null;

              return (
              <li key={doc.id} className="border p-3 rounded">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium">
                      {relatedText?.title || text.title}
                      {relatedText?.author && (
                        <span className="opacity-80"> • {relatedText.author}</span>
                      )}
                      <span className="opacity-70"> • {doc.meta?.filename || 'Unknown file'}</span>
                    </div>
                    <div className="text-sm opacity-70">
                      Type: {doc.source_type} • Status: {doc.ingest_status}
                      {doc.created_at && ` • Uploaded: ${new Date(doc.created_at).toLocaleDateString()}`}
                      <DocumentEmbeddedStats
                        textId={id}
                        documentId={doc.id}
                        ingestStatus={doc.ingest_status}
                      />
                    </div>
                    {doc.ingest_status !== 'embedded' && (
                      <div className="text-sm text-gray-500 mt-2">
                        Preview available after ingestion is complete
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 ml-4">
                    {doc.ingest_status === 'embedded' && (
                      <>
                        <IngestPreviewLink textId={id} documentId={doc.id} />
                        <RagPreviewLink textId={id} documentId={doc.id} />
                        <DisplayPreviewLink
                          textId={id}
                          documentId={doc.id}
                          filename={doc.meta?.filename}
                        />
                      </>
                    )}
                    <DeleteDocumentButton
                      textId={id}
                      documentId={doc.id}
                      filename={doc.meta?.filename}
                    />
                  </div>
                </div>
              </li>
            )})}
          </ul>
        </div>
      )}
    </main>
  );
}

