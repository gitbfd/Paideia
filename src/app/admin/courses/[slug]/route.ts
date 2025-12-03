// api/admin/courses/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClientForRoute } from '@/lib/supabase/route';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { supabase, applyCookies } = createClientForRoute(req);
  const { slug } = await params;
  const updates = await req.json().catch(() => ({}));

  const { data, error } = await supabase
    .from('courses')
    .update({
      title: updates.title,
      description: updates.description,
      status: updates.status,
    })
    .eq('slug', slug)
    .select()
    .single();

  if (error) return applyCookies(NextResponse.json({ error: error.message }, { status: 400 }));
  return applyCookies(NextResponse.json({ success: true, course: data }, { status: 200 }));
}
