// src/app/api/notes/route.ts
import { NextResponse } from 'next/server';
import { createClientServer } from '@/lib/supabase';

export async function POST(req: Request) {
  const supabase = await createClientServer(); // <-- ADD await here
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { data, error } = await supabase
    .from('notes')
    .insert({ user_id: user.id, title: body.title, body: body.body })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}