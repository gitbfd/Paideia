// src/app/courses/[slug]/ask/route.ts
// This endpoint does not call an LLM. It returns the best chunks so you can render them or send them to your model of choice. If you want, we can add a /complete endpoint that calls your LLM.

import { NextRequest, NextResponse } from 'next/server';
import { createClientForRoute } from '@/lib/supabase/route';
import { embedText } from '@/lib/rag';

// POST /courses/:slug/ask  body: { question: string, k?: number }
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { supabase, applyCookies } = createClientForRoute(req);
  const { slug } = await params;
  const body = await req.json().catch(() => ({}));
  const question: string = body?.question || '';
  const k = Math.min(Math.max(Number(body?.k || 6), 1), 20);

  if (!question) {
    return applyCookies(NextResponse.json({ error: 'Missing question' }, { status: 400 }));
  }

  // First, get the course ID from slug
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, status')
    .eq('slug', slug)
    .single();

  if (courseError || !course) {
    return applyCookies(NextResponse.json({ error: 'Course not found' }, { status: 404 }));
  }

  // Only allow asking questions on published courses
  if (course.status !== 'published') {
    return applyCookies(NextResponse.json({ error: 'Course is not published' }, { status: 403 }));
  }

  // 1) embed the question
  let qEmbedding: number[];
  try {
    qEmbedding = await embedText(question);
  } catch (e: any) {
    return applyCookies(NextResponse.json({ error: e?.message || 'Embedding error' }, { status: 500 }));
  }

  // 2) vector search scoped to course_id via RPC (character-based approach)
  // Use the new character-based function for text-based courses
  const { data, error } = await supabase.rpc('match_text_chunks_for_course', {
    p_course_id: course.id,
    p_query_embedding: qEmbedding,
    p_match_count: k,
    p_max_order_index: null, // No limit - include all sections in course
  });

  if (error) {
    return applyCookies(NextResponse.json({ error: error.message }, { status: 400 }));
  }

  // 3) Return top chunks (you'll call your LLM client-side or via another API)
  return applyCookies(NextResponse.json({ matches: data }, { status: 200 }));
}

