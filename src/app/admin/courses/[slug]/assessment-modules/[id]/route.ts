// src/app/admin/courses/[slug]/assessment-modules/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClientForRoute } from '@/lib/supabase/route';

// PATCH /admin/courses/:slug/assessment-modules/:id
// Update an assessment module (e.g., order_index)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { supabase, applyCookies } = createClientForRoute(req);
  const { slug, id } = await params;
  const body = await req.json().catch(() => ({}));
  const { order_index } = body ?? {};

  if (order_index === undefined) {
    return applyCookies(
      NextResponse.json({ error: 'order_index is required' }, { status: 400 })
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

  // Update the assessment module (verify it belongs to this course)
  const { data, error } = await supabase
    .from('assessment_modules')
    .update({ order_index: Number(order_index), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('course_id', course.id)
    .select()
    .single();

  if (error) {
    return applyCookies(NextResponse.json({ error: error.message }, { status: 400 }));
  }

  return applyCookies(NextResponse.json({ success: true, module: data }, { status: 200 }));
}

// DELETE /admin/courses/:slug/assessment-modules/:id
// Delete an assessment module
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { supabase, applyCookies } = createClientForRoute(req);
  const { slug, id } = await params;

  // Get course ID from slug
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id')
    .eq('slug', slug)
    .single();

  if (courseError || !course) {
    return applyCookies(NextResponse.json({ error: 'Course not found' }, { status: 404 }));
  }

  // Delete the assessment module (verify it belongs to this course)
  const { error } = await supabase
    .from('assessment_modules')
    .delete()
    .eq('id', id)
    .eq('course_id', course.id);

  if (error) {
    return applyCookies(NextResponse.json({ error: error.message }, { status: 400 }));
  }

  return applyCookies(NextResponse.json({ success: true }, { status: 200 }));
}

