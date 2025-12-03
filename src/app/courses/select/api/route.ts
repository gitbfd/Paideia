// src/app/courses/select/api/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClientForRoute } from '@/lib/supabase/route';

// POST /courses/select/api
// Enroll a student in a course
export async function POST(req: NextRequest) {
  const { supabase, applyCookies } = createClientForRoute(req);
  const body = await req.json().catch(() => ({}));
  const { course_id } = body ?? {};

  if (!course_id) {
    return applyCookies(NextResponse.json({ error: 'Missing course_id' }, { status: 400 }));
  }

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return applyCookies(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
  }

  // Verify course exists and is published
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, status')
    .eq('id', course_id)
    .single();

  if (courseError || !course) {
    return applyCookies(NextResponse.json({ error: 'Course not found' }, { status: 404 }));
  }

  if (course.status !== 'published') {
    return applyCookies(NextResponse.json({ error: 'Course is not published' }, { status: 400 }));
  }

  // Check if already enrolled
  const { data: existing, error: checkError } = await supabase
    .from('course_enrollments')
    .select('user_id, course_id')
    .eq('user_id', user.id)
    .eq('course_id', course_id)
    .maybeSingle();

  if (checkError) {
    return applyCookies(NextResponse.json({ error: checkError.message }, { status: 400 }));
  }

  if (existing) {
    return applyCookies(NextResponse.json({ error: 'Already enrolled in this course' }, { status: 400 }));
  }

  // Enroll the user
  const { data, error } = await supabase
    .from('course_enrollments')
    .insert({
      user_id: user.id,
      course_id: course_id,
      role: 'student',
    })
    .select()
    .single();

  if (error) {
    return applyCookies(NextResponse.json({ error: error.message }, { status: 400 }));
  }

  return applyCookies(NextResponse.json({ success: true, enrollment: data }, { status: 201 }));
}

