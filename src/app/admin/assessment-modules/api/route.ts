// src/app/admin/assessment-modules/api/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClientForRoute } from '@/lib/supabase/route';

// POST /admin/assessment-modules/api
// Create a new assessment module
export async function POST(req: NextRequest) {
  const { supabase, applyCookies } = createClientForRoute(req);
  const body = await req.json().catch(() => ({}));

  const {
    title,
    description,
    course_id,
    order_index,
    question_type,
    config,
  } = body;

  // Validate required fields
  if (!title || !course_id || !question_type) {
    return applyCookies(
      NextResponse.json(
        { error: 'Missing required fields: title, course_id, and question_type are required' },
        { status: 400 }
      )
    );
  }

  // Validate question_type
  const validQuestionTypes = ['definition', 'socratic', 'multiple_choice', 'short_answer'];
  if (!validQuestionTypes.includes(question_type)) {
    return applyCookies(
      NextResponse.json(
        { error: `Invalid question_type. Must be one of: ${validQuestionTypes.join(', ')}` },
        { status: 400 }
      )
    );
  }

  // Verify course exists
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id')
    .eq('id', course_id)
    .single();

  if (courseError || !course) {
    return applyCookies(
      NextResponse.json({ error: 'Course not found' }, { status: 404 })
    );
  }

  // Insert assessment module
  const { data: module, error } = await supabase
    .from('assessment_modules')
    .insert({
      title,
      description: description || null,
      course_id,
      order_index: order_index ?? 0,
      question_type,
      config: config || {},
    })
    .select()
    .single();

  if (error) {
    return applyCookies(
      NextResponse.json({ error: error.message }, { status: 400 })
    );
  }

  return applyCookies(
    NextResponse.json({ success: true, module }, { status: 201 })
  );
}

// PUT /admin/assessment-modules/api
// Update an existing assessment module
export async function PUT(req: NextRequest) {
  const { supabase, applyCookies } = createClientForRoute(req);
  const body = await req.json().catch(() => ({}));

  const {
    id,
    title,
    description,
    course_id,
    order_index,
    question_type,
    config,
  } = body;

  // Validate required fields
  if (!id) {
    return applyCookies(
      NextResponse.json({ error: 'Missing required field: id' }, { status: 400 })
    );
  }

  if (!title || !course_id || !question_type) {
    return applyCookies(
      NextResponse.json(
        { error: 'Missing required fields: title, course_id, and question_type are required' },
        { status: 400 }
      )
    );
  }

  // Validate question_type
  const validQuestionTypes = ['definition', 'socratic', 'multiple_choice', 'short_answer'];
  if (!validQuestionTypes.includes(question_type)) {
    return applyCookies(
      NextResponse.json(
        { error: `Invalid question_type. Must be one of: ${validQuestionTypes.join(', ')}` },
        { status: 400 }
      )
    );
  }

  // Verify module exists
  const { data: existingModule, error: moduleError } = await supabase
    .from('assessment_modules')
    .select('id')
    .eq('id', id)
    .single();

  if (moduleError || !existingModule) {
    return applyCookies(
      NextResponse.json({ error: 'Assessment module not found' }, { status: 404 })
    );
  }

  // Verify course exists
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id')
    .eq('id', course_id)
    .single();

  if (courseError || !course) {
    return applyCookies(
      NextResponse.json({ error: 'Course not found' }, { status: 404 })
    );
  }

  // Update assessment module
  const { data: module, error } = await supabase
    .from('assessment_modules')
    .update({
      title,
      description: description || null,
      course_id,
      order_index: order_index ?? 0,
      question_type,
      config: config || {},
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return applyCookies(
      NextResponse.json({ error: error.message }, { status: 400 })
    );
  }

  return applyCookies(
    NextResponse.json({ success: true, module }, { status: 200 })
  );
}

