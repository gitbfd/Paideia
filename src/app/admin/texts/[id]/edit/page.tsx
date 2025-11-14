// src/app/admin/texts/[id]/edit/page.tsx
import Link from 'next/link';
import { createClientServer } from '@/lib/supabase-server';
import TextUploader from '@/components/TextUploader';
import TextEditForm from '@/components/TextEditForm';

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
    .select('id, source_type, ingest_status, created_at, meta')
    .eq('text_id', id)
    .order('created_at', { ascending: false });

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Edit: {text.title}</h1>
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
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li key={doc.id} className="border p-3 rounded flex items-center justify-between">
                <div>
                  <div className="font-medium">{doc.meta?.filename || 'Unknown file'}</div>
                  <div className="text-sm opacity-70">
                    Type: {doc.source_type} • Status: {doc.ingest_status}
                    {doc.created_at && ` • Uploaded: ${new Date(doc.created_at).toLocaleDateString()}`}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}

