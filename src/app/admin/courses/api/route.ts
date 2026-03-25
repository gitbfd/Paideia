// src/app/admin/courses/api/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClientForRoute } from '@/lib/supabase/route';

export async function POST(req: NextRequest) {
  const { supabase, applyCookies } = createClientForRoute(req);
  const body = await req.json().catch(() => ({}));
  const { title, description } = body ?? {};

  if (!title) return applyCookies(NextResponse.json({ error: 'Missing title' }, { status: 400 }));

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return applyCookies(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));

  // user_id is optional - kept for audit/historical tracking but not required
  const { data, error } = await supabase
    .from('courses')
    .insert({ user_id: user.id, title, description, status: 'draft' })
    .select()
    .single();

  if (error) return applyCookies(NextResponse.json({ error: error.message }, { status: 400 }));
  return applyCookies(NextResponse.json({ success: true, course: data }, { status: 201 }));
}

