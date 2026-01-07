// src/app/admin/assessment-modules/api/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClientForRoute } from '@/lib/supabase/route';

// POST /admin/assessment-modules/api
// Create a new assessment module
export async function POST(req: NextRequest) {
  const { supabase, applyCookies } = createClientForRoute(req);
  const body = await req.json().catch(() => ({}));

  // Refresh session to ensure it's current
  await supabase.auth.getSession();

  // Ensure we have a valid session
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error('[AM API] Auth error:', authError);
    return applyCookies(
      NextResponse.json({ error: 'Unauthorized - please log in' }, { status: 401 })
    );
  }

  // Verify user is an admin
  const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
  if (adminError) {
    console.error('[AM API] Admin check error:', adminError);
    return applyCookies(
      NextResponse.json({ 
        error: `Admin check failed: ${adminError.message}` 
      }, { status: 500 })
    );
  }
  if (!isAdmin) {
    console.error('[AM API] User is not admin. User ID:', user.id);
    return applyCookies(
      NextResponse.json({ 
        error: `Forbidden - admin access required. User ID: ${user.id}. Please ensure this user is in the app_admins table.` 
      }, { status: 403 })
    );
  }

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
    console.error('[AM API] Insert error:', error);
    console.error('[AM API] User ID:', user.id);
    console.error('[AM API] Is Admin:', isAdmin);
    return applyCookies(
      NextResponse.json({ 
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? {
          user_id: user.id,
          is_admin: isAdmin,
          error_code: error.code,
        } : undefined
      }, { status: 400 })
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
  // Only update order_index if explicitly provided (otherwise preserve existing value)
  const updateData: any = {
    title,
    description: description || null,
    course_id,
    question_type,
    config: config || {},
    updated_at: new Date().toISOString(),
  };
  
  // Only include order_index if it's explicitly provided in the request
  if (order_index !== undefined) {
    updateData.order_index = order_index;
  }

  const { data: module, error } = await supabase
    .from('assessment_modules')
    .update(updateData)
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

