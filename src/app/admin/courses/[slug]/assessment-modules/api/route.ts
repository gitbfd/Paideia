// src/app/admin/courses/[slug]/assessment-modules/api/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClientForRoute } from '@/lib/supabase/route';

// GET /admin/courses/:slug/assessment-modules/api
// Get all assessment modules for a course
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

  // Get assessment modules
  const { data: modules, error } = await supabase
    .from('assessment_modules')
    .select('id, title, description, question_type, order_index, created_at')
    .eq('course_id', course.id)
    .order('order_index', { ascending: true });

  if (error) {
    return applyCookies(NextResponse.json({ error: error.message }, { status: 400 }));
  }

  return applyCookies(NextResponse.json({ modules: modules || [] }, { status: 200 }));
}

