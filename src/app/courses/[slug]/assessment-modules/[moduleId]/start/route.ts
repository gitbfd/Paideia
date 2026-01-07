// src/app/courses/[slug]/assessment-modules/[moduleId]/start/route.ts
// Start an assessment session and generate questions

import { NextRequest, NextResponse } from 'next/server';
import { createClientForRoute } from '@/lib/supabase/route';
import { embedText } from '@/lib/rag';
import { generateQuestions } from '@/lib/assessment-modules/llm';

// POST /courses/:slug/assessment-modules/:moduleId/start
// Start a new assessment session and generate questions
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; moduleId: string }> }
) {
  const { supabase, applyCookies } = createClientForRoute(req);
  const { slug, moduleId } = await params;

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return applyCookies(
      NextResponse.json({ error: 'Unauthorized - please log in' }, { status: 401 })
    );
  }

  // Get course ID from slug
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, status')
    .eq('slug', slug)
    .single();

  if (courseError || !course) {
    return applyCookies(NextResponse.json({ error: 'Course not found' }, { status: 404 }));
  }

  // Verify course is published
  if (course.status !== 'published') {
    return applyCookies(
      NextResponse.json({ error: 'Course is not published' }, { status: 403 })
    );
  }

  // Get assessment module
  const { data: module, error: moduleError } = await supabase
    .from('assessment_modules')
    .select('id, title, question_type, config, order_index')
    .eq('id', moduleId)
    .eq('course_id', course.id)
    .single();

  if (moduleError || !module) {
    return applyCookies(
      NextResponse.json({ error: 'Assessment module not found' }, { status: 404 })
    );
  }

  // Check if user is enrolled
  const { data: enrollment } = await supabase
    .from('course_enrollments')
    .select('user_id')
    .eq('course_id', course.id)
    .eq('user_id', user.id)
    .single();

  if (!enrollment) {
    return applyCookies(
      NextResponse.json({ error: 'You must be enrolled in this course' }, { status: 403 })
    );
  }

  // Check for existing in-progress session with questions
  const { data: existingSession } = await supabase
    .from('assessment_sessions')
    .select(`
      id,
      assessment_questions (id)
    `)
    .eq('assessment_module_id', moduleId)
    .eq('user_id', user.id)
    .eq('status', 'in_progress')
    .maybeSingle();

  if (existingSession) {
    // Check if session has questions
    const questionCount = existingSession.assessment_questions?.length || 0;
    console.log('[Assessment Start] Found existing session:', {
      sessionId: existingSession.id,
      questionCount,
    });
    
    if (questionCount > 0) {
      // Return existing session with questions
      return applyCookies(
        NextResponse.json({ 
          session_id: existingSession.id,
          message: 'Resuming existing session',
          questions_count: questionCount
        }, { status: 200 })
      );
    } else {
      // Delete empty session and create a new one
      console.log('[Assessment Start] Existing session has no questions, deleting and recreating');
      await supabase.from('assessment_sessions').delete().eq('id', existingSession.id);
    }
  }

  // Get the highest attempt number for this user/module
  const { data: previousAttempts } = await supabase
    .from('assessment_sessions')
    .select('attempt_number')
    .eq('assessment_module_id', moduleId)
    .eq('user_id', user.id)
    .order('attempt_number', { ascending: false })
    .limit(1);

  const attemptNumber = previousAttempts && previousAttempts.length > 0
    ? (previousAttempts[0].attempt_number || 0) + 1
    : 1;

  // Check if multiple attempts are allowed
  const config = module.config || {};
  const allowMultipleAttempts = config.allow_multiple_attempts !== false; // Default to true

  if (!allowMultipleAttempts && attemptNumber > 1) {
    return applyCookies(
      NextResponse.json({ 
        error: 'Multiple attempts are not allowed for this assessment' 
      }, { status: 403 })
    );
  }

  // Create new assessment session
  const { data: session, error: sessionError } = await supabase
    .from('assessment_sessions')
    .insert({
      assessment_module_id: moduleId,
      user_id: user.id,
      status: 'in_progress',
      attempt_number: attemptNumber,
    })
    .select()
    .single();

  if (sessionError || !session) {
    return applyCookies(
      NextResponse.json({ error: sessionError?.message || 'Failed to create session' }, { status: 400 })
    );
  }

  // Get RAG chunks for question generation (limited to sections above this AM)
  const ragContextCount = config.rag_context_count || 8;
  
  // Use a generic query to get relevant chunks
  const queryEmbedding = await embedText(module.title || 'assessment questions');
  
  const { data: ragChunks, error: ragError } = await supabase.rpc('match_text_chunks_for_course', {
    p_course_id: course.id,
    p_query_embedding: queryEmbedding,
    p_match_count: ragContextCount,
    p_max_order_index: module.order_index, // Only include sections above this AM
  });

  if (ragError) {
    console.error('[Assessment Start] RAG error:', ragError);
    // Continue without RAG chunks - questions might be less contextual
  }

  // Generate questions using LLM
  try {
    console.log('[Assessment Start] Generating questions...', {
      ragChunksCount: ragChunks?.length || 0,
      questionType: module.question_type,
      questionCount: config.question_count || 5,
      difficulty: config.difficulty || 'medium',
    });

    const questions = await generateQuestions({
      ragChunks: ragChunks || [],
      questionType: module.question_type as any,
      questionPrompt: config.question_prompt,
      questionCount: config.question_count || 5,
      difficulty: config.difficulty || 'medium',
    });

    console.log('[Assessment Start] Questions generated:', questions.length);

    // Store generated questions
    const questionsToInsert = questions.map((q, index) => ({
      assessment_session_id: session.id,
      question_text: q.question_text,
      question_type: module.question_type,
      correct_answer: q.correct_answer,
      metadata: q.metadata || {},
      order_index: index,
    }));

    console.log('[Assessment Start] Attempting to insert questions:', {
      count: questionsToInsert.length,
      sessionId: session.id,
      userId: user.id,
    });

    const { data: insertedQuestions, error: questionsError } = await supabase
      .from('assessment_questions')
      .insert(questionsToInsert)
      .select();

    if (questionsError) {
      console.error('[Assessment Start] Failed to store questions:', {
        error: questionsError,
        code: questionsError.code,
        message: questionsError.message,
        details: questionsError.details,
        hint: questionsError.hint,
      });
      
      // Delete the session if questions can't be stored
      await supabase.from('assessment_sessions').delete().eq('id', session.id);
      
      return applyCookies(
        NextResponse.json({ 
          error: `Failed to store questions: ${questionsError.message}. Code: ${questionsError.code}. This may be due to RLS policy restrictions. Please check that the "Students can insert questions for their own sessions" policy exists.` 
        }, { status: 500 })
      );
    }

    if (!insertedQuestions || insertedQuestions.length === 0) {
      console.error('[Assessment Start] No questions were inserted - insert succeeded but returned no data');
      await supabase.from('assessment_sessions').delete().eq('id', session.id);
      return applyCookies(
        NextResponse.json({ 
          error: 'Failed to store questions - insert succeeded but no questions were returned' 
        }, { status: 500 })
      );
    }

    console.log('[Assessment Start] Successfully stored questions:', insertedQuestions.length);

    return applyCookies(
      NextResponse.json({ 
        success: true,
        session_id: session.id,
        questions_generated: questions.length,
        questions_stored: insertedQuestions.length
      }, { status: 201 })
    );
  } catch (error: any) {
    console.error('[Assessment Start] Question generation error:', error);
    
    // Delete the session if question generation failed
    await supabase.from('assessment_sessions').delete().eq('id', session.id);
    
    return applyCookies(
      NextResponse.json({ 
        error: `Failed to generate questions: ${error.message}` 
      }, { status: 500 })
    );
  }
}

