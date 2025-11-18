// src/app/admin/courses/[slug]/text-sections/[sectionId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClientForRoute } from '@/lib/supabase-route';

// DELETE /admin/courses/:slug/text-sections/:sectionId
// Delete a text section from a course
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string; sectionId: string }> }) {
  const { supabase, applyCookies } = createClientForRoute(req);
  const { slug, sectionId } = await params;

  // Get course ID from slug
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id')
    .eq('slug', slug)
    .single();

  if (courseError || !course) {
    return applyCookies(NextResponse.json({ error: 'Course not found' }, { status: 404 }));
  }

  // Delete the section (verify it belongs to this course)
  const { error } = await supabase
    .from('course_text_sections')
    .delete()
    .eq('id', sectionId)
    .eq('course_id', course.id);

  if (error) {
    return applyCookies(NextResponse.json({ error: error.message }, { status: 400 }));
  }

  return applyCookies(NextResponse.json({ success: true }, { status: 200 }));
}

// PATCH /admin/courses/:slug/text-sections/:sectionId
// Update a text section (e.g., order_index)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string; sectionId: string }> }) {
  const { supabase, applyCookies } = createClientForRoute(req);
  const { slug, sectionId } = await params;
  const body = await req.json().catch(() => ({}));
  const { order_index } = body ?? {};

  // Get course ID from slug
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id')
    .eq('slug', slug)
    .single();

  if (courseError || !course) {
    return applyCookies(NextResponse.json({ error: 'Course not found' }, { status: 404 }));
  }

  // Update the section (verify it belongs to this course)
  const { data, error } = await supabase
    .from('course_text_sections')
    .update({ order_index: Number(order_index) })
    .eq('id', sectionId)
    .eq('course_id', course.id)
    .select()
    .single();

  if (error) {
    return applyCookies(NextResponse.json({ error: error.message }, { status: 400 }));
  }

  return applyCookies(NextResponse.json({ success: true, section: data }, { status: 200 }));
}

