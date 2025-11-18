// src/app/admin/texts/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClientForRoute } from '@/lib/supabase-route';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, applyCookies } = createClientForRoute(req);
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { title, publication_date, author, translator, tags } = body ?? {};

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return applyCookies(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));

  const updates: any = {};
  if (title !== undefined) updates.title = title;
  if (publication_date !== undefined) updates.publication_date = publication_date || null;
  if (author !== undefined) updates.author = author || null;
  if (translator !== undefined) updates.translator = translator || null;
  if (tags !== undefined) updates.tags = tags || null;

  const { data, error } = await supabase
    .from('texts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return applyCookies(NextResponse.json({ error: error.message }, { status: 400 }));
  return applyCookies(NextResponse.json({ success: true, text: data }, { status: 200 }));
}

