// src/app/admin/courses/[slug]/text-sections/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClientForRoute } from '@/lib/supabase-route';

// GET /admin/courses/:slug/text-sections
// Get all text sections for a course
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { supabase, applyCookies } = createClientForRoute(req);
  const { slug } = await params;

  // Get course ID from slug
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id')
    .eq('slug', slug)
    .single();

  if (courseError || !course) {
    return applyCookies(NextResponse.json({ error: 'Course not found' }, { status: 404 }));
  }

  // Get text sections with related text document and text info
  const { data: sections, error } = await supabase
    .from('course_text_sections')
    .select(`
      id,
      start_line,
      end_line,
      title,
      order_index,
      created_at,
      text_document_id,
      text_documents (
        id,
        meta,
        text_id,
        texts (
          id,
          title,
          author
        )
      )
    `)
    .eq('course_id', course.id)
    .order('order_index', { ascending: true });

  if (error) {
    return applyCookies(NextResponse.json({ error: error.message }, { status: 400 }));
  }

  return applyCookies(NextResponse.json({ sections: sections || [] }, { status: 200 }));
}

// POST /admin/courses/:slug/text-sections
// Add a text section to a course
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { supabase, applyCookies } = createClientForRoute(req);
  const { slug } = await params;
  const body = await req.json().catch(() => ({}));
  const { text_document_id, start_line, end_line, title, order_index } = body ?? {};

  // Validate required fields
  if (!text_document_id || !start_line || !end_line) {
    return applyCookies(NextResponse.json({ error: 'Missing required fields: text_document_id, start_line, end_line' }, { status: 400 }));
  }

  if (start_line < 1 || end_line < start_line) {
    return applyCookies(NextResponse.json({ error: 'Invalid line range' }, { status: 400 }));
  }

  // Get course ID from slug
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id')
    .eq('slug', slug)
    .single();

  if (courseError || !course) {
    return applyCookies(NextResponse.json({ error: 'Course not found' }, { status: 404 }));
  }

  // Verify text document exists
  const { data: doc, error: docError } = await supabase
    .from('text_documents')
    .select('id')
    .eq('id', text_document_id)
    .single();

  if (docError || !doc) {
    return applyCookies(NextResponse.json({ error: 'Text document not found' }, { status: 404 }));
  }

  // Insert text section
  const { data, error } = await supabase
    .from('course_text_sections')
    .insert({
      course_id: course.id,
      text_document_id,
      start_line: Number(start_line),
      end_line: Number(end_line),
      title: title || null,
      order_index: order_index || 0,
    })
    .select()
    .single();

  if (error) {
    return applyCookies(NextResponse.json({ error: error.message }, { status: 400 }));
  }

  return applyCookies(NextResponse.json({ success: true, section: data }, { status: 201 }));
}

