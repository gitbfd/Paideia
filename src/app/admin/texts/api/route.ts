// src/app/admin/texts/api/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClientForRoute } from '@/lib/supabase-route';

export async function POST(req: NextRequest) {
  const { supabase, applyCookies } = createClientForRoute(req);
  const body = await req.json().catch(() => ({}));
  const { title, publication_date, author, translator, tags } = body ?? {};

  if (!title) return applyCookies(NextResponse.json({ error: 'Missing title' }, { status: 400 }));

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return applyCookies(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));

  const { data, error } = await supabase
    .from('texts')
    .insert({
      user_id: user.id,
      title,
      publication_date: publication_date || null,
      author: author || null,
      translator: translator || null,
      tags: tags || null,
    })
    .select()
    .single();

  if (error) return applyCookies(NextResponse.json({ error: error.message }, { status: 400 }));
  return applyCookies(NextResponse.json({ success: true, text: data }, { status: 201 }));
}

