// src/app/courses/[slug]/assessment-modules/[moduleId]/session/[sessionId]/route.ts
// Get assessment session data and questions

import { NextRequest, NextResponse } from 'next/server';
import { createClientForRoute } from '@/lib/supabase/route';

// GET /courses/:slug/assessment-modules/:moduleId/session/:sessionId
// Get assessment session with questions
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; moduleId: string; sessionId: string }> }
) {
  const { supabase, applyCookies } = createClientForRoute(req);
  const { slug, moduleId, sessionId } = await params;

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return applyCookies(
      NextResponse.json({ error: 'Unauthorized - please log in' }, { status: 401 })
    );
  }

  // Get session (verify it belongs to the user)
  const { data: session, error: sessionError } = await supabase
    .from('assessment_sessions')
    .select(`
      id,
      status,
      started_at,
      completed_at,
      score,
      attempt_number,
      assessment_module_id,
      assessment_modules (
        id,
        title,
        description,
        question_type,
        config
      )
    `)
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single();

  if (sessionError || !session) {
    return applyCookies(
      NextResponse.json({ error: 'Session not found' }, { status: 404 })
    );
  }

  // Verify it matches the module
  if (session.assessment_module_id !== moduleId) {
    return applyCookies(
      NextResponse.json({ error: 'Session does not match module' }, { status: 400 })
    );
  }

  // Get questions for this session
  const { data: questions, error: questionsError } = await supabase
    .from('assessment_questions')
    .select(`
      id,
      question_text,
      question_type,
      correct_answer,
      metadata,
      order_index
    `)
    .eq('assessment_session_id', sessionId)
    .order('order_index', { ascending: true });

  if (questionsError) {
    console.error('[Session GET] Error fetching questions:', {
      error: questionsError,
      sessionId,
      userId: user.id,
    });
    return applyCookies(
      NextResponse.json({ error: questionsError.message }, { status: 400 })
    );
  }

  console.log('[Session GET] Questions fetched:', {
    sessionId,
    questionCount: questions?.length || 0,
    userId: user.id,
  });

  // Get answers for this session
  const { data: answers, error: answersError } = await supabase
    .from('assessment_answers')
    .select(`
      id,
      assessment_question_id,
      answer_text,
      score,
      feedback,
      evaluated_at
    `)
    .eq('assessment_session_id', sessionId);

  if (answersError) {
    return applyCookies(
      NextResponse.json({ error: answersError.message }, { status: 400 })
    );
  }

  // Map answers by question ID for easy lookup
  const answersByQuestion = new Map(
    (answers || []).map(a => [a.assessment_question_id, a])
  );

  // Combine questions with their answers
  const questionsWithAnswers = (questions || []).map(q => ({
    ...q,
    answer: answersByQuestion.get(q.id) || null,
  }));

  return applyCookies(
    NextResponse.json({
      session,
      questions: questionsWithAnswers,
    }, { status: 200 })
  );
}

