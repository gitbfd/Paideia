//api/admin/courses/[id]/publish/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClientForRoute } from '@/lib/supabase-route';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { supabase, applyCookies } = createClientForRoute(req);

  const { data, error } = await supabase
    .from('courses')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single();

  if (error) return applyCookies(NextResponse.json({ error: error.message }, { status: 400 }));
  return applyCookies(NextResponse.json({ success: true, course: data }, { status: 200 }));
}
