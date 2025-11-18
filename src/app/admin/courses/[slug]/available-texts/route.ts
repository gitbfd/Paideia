// src/app/admin/courses/[slug]/available-texts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClientForRoute } from '@/lib/supabase-route';

// GET /admin/courses/:slug/available-texts
// Get all texts with their embedded documents (for adding to course)
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  await params; // Acknowledge params even though we don't use slug
  const { supabase, applyCookies } = createClientForRoute(req);

  // Get all texts with their embedded documents
  const { data: texts, error } = await supabase
    .from('texts')
    .select(`
      id,
      title,
      author,
      text_documents (
        id,
        meta,
        ingest_status,
        source_type
      )
    `)
    .order('updated_at', { ascending: false });

  if (error) {
    return applyCookies(NextResponse.json({ error: error.message }, { status: 400 }));
  }

  // Filter to only include texts with embedded documents
  const textsWithEmbeddedDocs = texts
    ?.map(text => ({
      ...text,
      text_documents: text.text_documents?.filter((doc: any) => doc.ingest_status === 'embedded') || []
    }))
    .filter(text => text.text_documents.length > 0) || [];

  return applyCookies(NextResponse.json({ texts: textsWithEmbeddedDocs }, { status: 200 }));
}

