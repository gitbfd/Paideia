// src/app/admin/courses/[slug]/text-sections/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClientForRoute } from '@/lib/supabase/route';

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
      start_char,
      end_char,
      start_block,
      end_block,
      title,
      order_index,
      created_at,
      text_document_id,
      text_documents (
        id,
        meta,
        display_content,
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
// Accepts either character ranges (preferred) or line ranges (for backward compatibility)
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { supabase, applyCookies } = createClientForRoute(req);
  const { slug } = await params;
  const body = await req.json().catch(() => ({}));
  const { 
    text_document_id, 
    start_char, 
    end_char,
    start_block,
    end_block,
    title, 
    order_index 
  } = body ?? {};

  // Validate required fields - need either character range OR line range
  if (!text_document_id) {
    return applyCookies(NextResponse.json({ error: 'Missing required field: text_document_id' }, { status: 400 }));
  }

  const hasCharRange = start_char !== undefined && end_char !== undefined;
  
  if (!hasCharRange) {
    return applyCookies(
      NextResponse.json(
        { error: 'Missing required fields: start_char and end_char are required' },
        { status: 400 }
      )
    );
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

  // Get text document with display_content and rag_text
  const { data: doc, error: docError } = await supabase
    .from('text_documents')
    .select('id, display_content, rag_text')
    .eq('id', text_document_id)
    .single();

  if (docError || !doc) {
    return applyCookies(NextResponse.json({ error: 'Text document not found' }, { status: 404 }));
  }

  // Validate character positions
  const finalStartChar = Number(start_char);
  const finalEndChar = Number(end_char);
  
  if (
    isNaN(finalStartChar) ||
    isNaN(finalEndChar) ||
    finalStartChar < 0 ||
    finalEndChar <= finalStartChar
  ) {
    return applyCookies(
      NextResponse.json({ error: 'Invalid character range' }, { status: 400 })
    );
  }

  // Insert text section
  const insertData: any = {
    course_id: course.id,
    text_document_id,
    title: title || null,
    order_index: order_index || 0,
  };

  // Add character positions if available
  insertData.start_char = finalStartChar;
  insertData.end_char = finalEndChar;
  
  // Add block numbers if provided
  if (start_block !== undefined && end_block !== undefined) {
    const finalStartBlock = Number(start_block);
    const finalEndBlock = Number(end_block);
    if (!isNaN(finalStartBlock) && !isNaN(finalEndBlock) && finalStartBlock > 0 && finalEndBlock >= finalStartBlock) {
      insertData.start_block = finalStartBlock;
      insertData.end_block = finalEndBlock;
    }
  }
  
  // Explicitly null out line numbers for new sections
  insertData.start_line = null;
  insertData.end_line = null;

  const { data, error } = await supabase
    .from('course_text_sections')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    return applyCookies(NextResponse.json({ error: error.message }, { status: 400 }));
  }

  return applyCookies(NextResponse.json({ success: true, section: data }, { status: 201 }));
}

