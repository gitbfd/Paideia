// api/admin/courses/[id]/documents/[documentId]/ingest/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { createClientAdmin } from '@/lib/supabase-admin';
import { normalizeText } from '@/lib/text-cleaner';
import { chunkText } from '@/lib/chunker';
import { embedText } from '@/lib/embeddings';

export async function POST(_req: NextRequest, { params }: { params: { id: string; documentId: string } }) {
  const admin = createClientAdmin();

  // 1) Load doc row (to get storage path & type)
  const { data: doc, error: docErr } = await admin
    .from('course_documents')
    .select('id, course_id, storage_path, source_type')
    .eq('id', params.documentId)
    .single();

  if (docErr || !doc) {
    return NextResponse.json({ error: docErr?.message ?? 'Document not found' }, { status: 404 });
  }

  // 2) Download file from storage (private bucket)
  const { data: fileData, error: dlErr } = await admin.storage.from('course-docs').download(doc.storage_path!);
  if (dlErr || !fileData) return NextResponse.json({ error: dlErr?.message ?? 'Download failed' }, { status: 400 });

  // 3) Extract text (PDF/TXT/HTML); for brevity we assume TXT here.
  //    Replace with a real extractor (pdf-parse/pdfjs/pdfplumber/textract/etc.)
  const raw = await fileData.text(); // works for text-like files

  // 4) Clean + chunk
  const cleaned = normalizeText(raw);
  const chunks = chunkText(cleaned, 2000, 200);

  // 5) (Re)ingest: delete existing chunks, then insert new ones with embeddings
  await admin.from('document_chunks').delete().eq('document_id', doc.id);

  for (let i = 0; i < chunks.length; i++) {
    const content = chunks[i];
    // ⚠️ implement embedText() for your provider
    const vector = await embedText(content); // number[] length must match pgvector dim

    const { error: insErr } = await admin.from('document_chunks').insert({
      document_id: doc.id,
      course_id: doc.course_id,
      chunk_index: i,
      content,
      embedding: vector,
    });
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });
  }

  // 6) Mark as embedded
  const { error: upErr } = await admin
    .from('course_documents')
    .update({ ingest_status: 'embedded' })
    .eq('id', doc.id);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

  return NextResponse.json({ success: true, chunks: chunks.length }, { status: 200 });
}
