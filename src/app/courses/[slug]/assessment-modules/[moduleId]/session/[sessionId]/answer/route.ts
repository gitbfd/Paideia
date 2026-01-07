// src/app/courses/[slug]/assessment-modules/[moduleId]/session/[sessionId]/answer/route.ts
// Submit an answer to a question

import { NextRequest, NextResponse } from 'next/server';
import { createClientForRoute } from '@/lib/supabase/route';
import { evaluateAnswer } from '@/lib/assessment-modules/llm';

// POST /courses/:slug/assessment-modules/:moduleId/session/:sessionId/answer
// Submit an answer to a question
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; moduleId: string; sessionId: string }> }
) {
  const { supabase, applyCookies } = createClientForRoute(req);
  const { slug, moduleId, sessionId } = await params;
  const body = await req.json().catch(() => ({}));

  const { question_id, answer_text } = body;

  if (!question_id || answer_text === undefined) {
    return applyCookies(
      NextResponse.json({ error: 'Missing question_id or answer_text' }, { status: 400 })
    );
  }

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return applyCookies(
      NextResponse.json({ error: 'Unauthorized - please log in' }, { status: 401 })
    );
  }

  // Verify session belongs to user
  const { data: session, error: sessionError } = await supabase
    .from('assessment_sessions')
    .select('id, status, assessment_module_id')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single();

  if (sessionError || !session) {
    return applyCookies(
      NextResponse.json({ error: 'Session not found' }, { status: 404 })
    );
  }

  if (session.status !== 'in_progress') {
    return applyCookies(
      NextResponse.json({ error: 'Session is not in progress' }, { status: 400 })
    );
  }

  // Get question
  const { data: question, error: questionError } = await supabase
    .from('assessment_questions')
    .select('id, question_text, question_type, correct_answer, metadata')
    .eq('id', question_id)
    .eq('assessment_session_id', sessionId)
    .single();

  if (questionError || !question) {
    return applyCookies(
      NextResponse.json({ error: 'Question not found' }, { status: 404 })
    );
  }

  // Get module config for evaluation
  const { data: module } = await supabase
    .from('assessment_modules')
    .select('config')
    .eq('id', moduleId)
    .single();

  const config = module?.config || {};
  const rubric = config.evaluation_rubric;

  // Evaluate answer
  let evaluation: { score: number; feedback: string };
  try {
    evaluation = await evaluateAnswer({
      question: question.question_text,
      correctAnswer: question.correct_answer,
      studentAnswer: answer_text,
      questionType: question.question_type as any,
      rubric,
    });
  } catch (error: any) {
    console.error('[Answer Submit] Evaluation error:', error);
    // Store answer without evaluation if LLM fails
    evaluation = {
      score: 0,
      feedback: 'Evaluation pending - answer saved',
    };
  }

  // Store or update answer
  const { data: existingAnswer } = await supabase
    .from('assessment_answers')
    .select('id')
    .eq('assessment_question_id', question_id)
    .eq('assessment_session_id', sessionId)
    .maybeSingle();

  const answerData = {
    assessment_question_id: question_id,
    assessment_session_id: sessionId,
    answer_text: String(answer_text),
    score: evaluation.score,
    feedback: evaluation.feedback,
    evaluated_at: new Date().toISOString(),
  };

  let answer;
  if (existingAnswer) {
    // Update existing answer
    const { data: updated, error: updateError } = await supabase
      .from('assessment_answers')
      .update(answerData)
      .eq('id', existingAnswer.id)
      .select()
      .single();

    if (updateError) {
      return applyCookies(
        NextResponse.json({ error: updateError.message }, { status: 400 })
      );
    }
    answer = updated;
  } else {
    // Insert new answer
    const { data: inserted, error: insertError } = await supabase
      .from('assessment_answers')
      .insert(answerData)
      .select()
      .single();

    if (insertError) {
      return applyCookies(
        NextResponse.json({ error: insertError.message }, { status: 400 })
      );
    }
    answer = inserted;
  }

  return applyCookies(
    NextResponse.json({ success: true, answer }, { status: 200 })
  );
}

