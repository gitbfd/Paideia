// src/app/admin/texts/[id]/documents/[documentId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClientAdmin } from '@/lib/supabase-admin';

// DELETE /admin/texts/:id/documents/:documentId
// Deletes a document and all associated data (chunks, storage file)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  try {
    const admin = createClientAdmin();
    const { documentId } = await params;

    // 1) Get document info (including storage_path) before deletion
    const { data: doc, error: docErr } = await admin
      .from('text_documents')
      .select('id, storage_path')
      .eq('id', documentId)
      .single();

    if (docErr || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // 2) Delete RAG chunks (explicit deletion, though CASCADE should handle this)
    console.log('[DELETE] Deleting RAG chunks...');
    const { error: chunksErr } = await admin
      .from('text_document_chunks')
      .delete()
      .eq('document_id', documentId);

    if (chunksErr) {
      console.error('[DELETE] Error deleting chunks:', chunksErr);
      // Continue with deletion even if chunks deletion fails
    }

    // 3) Delete file from storage if storage_path exists
    if (doc.storage_path) {
      console.log('[DELETE] Deleting file from storage...');
      const { error: storageErr } = await admin.storage
        .from('course-docs')
        .remove([doc.storage_path]);

      if (storageErr) {
        console.error('[DELETE] Error deleting from storage:', storageErr);
        // Continue with database deletion even if storage deletion fails
      }
    }

    // 4) Delete document record (this will cascade to chunks if CASCADE is set)
    console.log('[DELETE] Deleting document record...');
    const { error: deleteErr } = await admin
      .from('text_documents')
      .delete()
      .eq('id', documentId);

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Document deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('[DELETE] Error:', error);
    return NextResponse.json({
      error: error?.message || 'An unexpected error occurred during deletion'
    }, { status: 500 });
  }
}

