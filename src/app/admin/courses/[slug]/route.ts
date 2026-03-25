// api/admin/courses/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { createClientForRoute } from '@/lib/supabase/route';

async function requireAdmin(
  supabase: ReturnType<typeof createClientForRoute>['supabase']
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  await supabase.auth.getSession();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { ok: false, status: 401, message: 'Unauthorized' };
  }
  const { data: isAdmin, error: rpcErr } = await supabase.rpc('is_admin');
  if (rpcErr) {
    return { ok: false, status: 500, message: 'Unable to verify permissions' };
  }
  if (!isAdmin) {
    return { ok: false, status: 403, message: 'Admin access required' };
  }
  return { ok: true };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { supabase, applyCookies } = createClientForRoute(req);
  const { slug } = await params;
  const updates = await req.json().catch(() => ({}));

  const gate = await requireAdmin(supabase);
  if (!gate.ok) {
    return applyCookies(
      NextResponse.json({ error: gate.message }, { status: gate.status })
    );
  }

  const { data: existing, error: fetchErr } = await supabase
    .from('courses')
    .select('id, status, slug')
    .eq('slug', slug)
    .single();

  if (fetchErr || !existing) {
    return applyCookies(NextResponse.json({ error: 'Course not found' }, { status: 404 }));
  }

  const newStatus = updates.status as string | undefined;
  if (
    newStatus === 'draft' &&
    existing.status !== 'draft'
  ) {
    const { count, error: cntErr } = await supabase
      .from('course_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', existing.id);

    if (cntErr) {
      return applyCookies(
        NextResponse.json({ error: cntErr.message }, { status: 400 })
      );
    }
    if (count !== null && count > 0) {
      return applyCookies(
        NextResponse.json(
          {
            error:
              'Cannot set course to draft while students are enrolled. Remove enrollments first.',
          },
          { status: 400 }
        )
      );
    }
  }

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

  if (data?.id) {
    revalidateTag(`course-${data.id}`, 'max');
    revalidateTag(`course-slug-${slug}`, 'max');
    revalidatePath(`/courses/${slug}`);
    revalidatePath(`/admin/courses/${slug}/edit`);
    revalidatePath('/admin/courses/draft');
    revalidatePath('/admin/courses/published');
  }
  return applyCookies(NextResponse.json({ success: true, course: data }, { status: 200 }));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { supabase, applyCookies } = createClientForRoute(_req);
  const { slug } = await params;

  const gate = await requireAdmin(supabase);
  if (!gate.ok) {
    return applyCookies(
      NextResponse.json({ error: gate.message }, { status: gate.status })
    );
  }

  const { data: course, error: fetchErr } = await supabase
    .from('courses')
    .select('id, status, slug')
    .eq('slug', slug)
    .single();

  if (fetchErr || !course) {
    return applyCookies(NextResponse.json({ error: 'Course not found' }, { status: 404 }));
  }

  if (course.status !== 'draft') {
    return applyCookies(
      NextResponse.json(
        { error: 'Only draft courses can be deleted.' },
        { status: 400 }
      )
    );
  }

  const { count, error: cntErr } = await supabase
    .from('course_enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', course.id);

  if (cntErr) {
    return applyCookies(NextResponse.json({ error: cntErr.message }, { status: 400 }));
  }
  if (count !== null && count > 0) {
    return applyCookies(
      NextResponse.json(
        { error: 'Cannot delete a course with active enrollments.' },
        { status: 400 }
      )
    );
  }

  const { error: delError } = await supabase.from('courses').delete().eq('id', course.id);

  if (delError) {
    return applyCookies(
      NextResponse.json(
        { error: delError.message },
        { status: 400 }
      )
    );
  }

  revalidateTag(`course-${course.id}`, 'max');
  revalidateTag(`course-slug-${slug}`, 'max');
  revalidatePath(`/courses/${slug}`);
  revalidatePath(`/admin/courses/${slug}/edit`);
  revalidatePath('/admin/courses/draft');
  revalidatePath('/admin/courses/published');
  revalidatePath('/admin/courses');

  return applyCookies(NextResponse.json({ success: true }, { status: 200 }));
}
