// api/admin/courses/[slug]/documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClientForRoute } from '@/lib/supabase-route';

// Expect body: { storage_path: string, source_type?: 'pdf'|'txt'|'html'|'markdown'|'other', bytes?: number, mime?: string, meta?: object }
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { supabase, applyCookies } = createClientForRoute(req);
  const { slug } = await params;
  const body = await req.json().catch(() => ({}));
  const { storage_path, source_type = 'pdf', bytes, mime, meta } = body;

  if (!storage_path) {
    return applyCookies(NextResponse.json({ error: 'Missing storage_path' }, { status: 400 }));
  }

  // First, get the course ID from slug
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id')
    .eq('slug', slug)
    .single();

  if (courseError || !course) {
    return applyCookies(NextResponse.json({ error: 'Course not found' }, { status: 404 }));
  }

  const { data, error } = await supabase
    .from('course_documents')
    .insert({
      course_id: course.id,
      storage_path,
      source_type,
      bytes,
      mime,
      meta,
      ingest_status: 'uploaded',
    })
    .select()
    .single();

  if (error) return applyCookies(NextResponse.json({ error: error.message }, { status: 400 }));
  return applyCookies(NextResponse.json({ success: true, document: data }, { status: 201 }));
}
