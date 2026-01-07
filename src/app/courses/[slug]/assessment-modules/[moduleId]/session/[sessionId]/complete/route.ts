// src/app/courses/[slug]/assessment-modules/[moduleId]/session/[sessionId]/complete/route.ts
// Complete an assessment session and calculate final score

import { NextRequest, NextResponse } from 'next/server';
import { createClientForRoute } from '@/lib/supabase/route';

// POST /courses/:slug/assessment-modules/:moduleId/session/:sessionId/complete
// Complete an assessment session
export async function POST(
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

  // Verify session belongs to user
  const { data: session, error: sessionError } = await supabase
    .from('assessment_sessions')
    .select('id, status')
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

  // Get all answers for this session
  const { data: answers, error: answersError } = await supabase
    .from('assessment_answers')
    .select('score')
    .eq('assessment_session_id', sessionId);

  if (answersError) {
    return applyCookies(
      NextResponse.json({ error: answersError.message }, { status: 400 })
    );
  }

  // Calculate average score
  const scores = (answers || []).map(a => a.score).filter(s => s !== null && s !== undefined);
  const averageScore = scores.length > 0
    ? scores.reduce((sum, s) => sum + (s || 0), 0) / scores.length
    : 0;

  // Convert to percentage (0-100)
  const scorePercentage = averageScore * 100;

  // Update session to completed
  const { data: updatedSession, error: updateError } = await supabase
    .from('assessment_sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      score: scorePercentage,
    })
    .eq('id', sessionId)
    .select()
    .single();

  if (updateError) {
    return applyCookies(
      NextResponse.json({ error: updateError.message }, { status: 400 })
    );
  }

  return applyCookies(
    NextResponse.json({
      success: true,
      session: updatedSession,
      score: scorePercentage,
    }, { status: 200 })
  );
}

