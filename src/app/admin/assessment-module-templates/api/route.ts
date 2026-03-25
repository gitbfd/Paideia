import { NextRequest, NextResponse } from 'next/server';
import { createClientForRoute } from '@/lib/supabase/route';

async function requireAdmin(supabase: ReturnType<typeof createClientForRoute>['supabase']) {
  await supabase.auth.getSession();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { user: null as null, error: 'Unauthorized' as const };
  }
  const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
  if (adminError) {
    return { user: null as null, error: 'Admin check failed' as const };
  }
  if (!isAdmin) {
    return { user: null as null, error: 'Forbidden' as const };
  }
  return { user, error: null as null };
}

// GET ?id=uuid (single) or list all
export async function GET(req: NextRequest) {
  const { supabase, applyCookies } = createClientForRoute(req);
  const admin = await requireAdmin(supabase);
  if (admin.error) {
    const status =
      admin.error === 'Unauthorized' ? 401 : admin.error === 'Forbidden' ? 403 : 500;
    return applyCookies(NextResponse.json({ error: admin.error }, { status }));
  }

  const id = req.nextUrl.searchParams.get('id');
  if (id) {
    const { data, error } = await supabase
      .from('assessment_module_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      return applyCookies(NextResponse.json({ error: error.message }, { status: 400 }));
    }
    if (!data) {
      return applyCookies(NextResponse.json({ error: 'Not found' }, { status: 404 }));
    }
    return applyCookies(NextResponse.json({ template: data }));
  }

  const { data, error } = await supabase
    .from('assessment_module_templates')
    .select('id, title, description, question_type, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    return applyCookies(NextResponse.json({ error: error.message }, { status: 400 }));
  }
  return applyCookies(NextResponse.json({ templates: data ?? [] }));
}

export async function POST(req: NextRequest) {
  const { supabase, applyCookies } = createClientForRoute(req);
  const admin = await requireAdmin(supabase);
  if (admin.error) {
    const status =
      admin.error === 'Unauthorized' ? 401 : admin.error === 'Forbidden' ? 403 : 500;
    return applyCookies(NextResponse.json({ error: admin.error }, { status }));
  }

  const body = await req.json().catch(() => ({}));
  const { title, description, question_type, config } = body;

  if (!title?.trim() || !question_type) {
    return applyCookies(
      NextResponse.json(
        { error: 'title and question_type are required' },
        { status: 400 }
      )
    );
  }

  const validQuestionTypes = ['definition', 'socratic', 'multiple_choice', 'short_answer'];
  if (!validQuestionTypes.includes(question_type)) {
    return applyCookies(
      NextResponse.json({ error: 'Invalid question_type' }, { status: 400 })
    );
  }

  const { data: template, error } = await supabase
    .from('assessment_module_templates')
    .insert({
      title: title.trim(),
      description: description ?? null,
      question_type,
      config: config && typeof config === 'object' ? config : {},
    })
    .select()
    .single();

  if (error) {
    return applyCookies(NextResponse.json({ error: error.message }, { status: 400 }));
  }
  return applyCookies(NextResponse.json({ success: true, template }, { status: 201 }));
}

export async function PUT(req: NextRequest) {
  const { supabase, applyCookies } = createClientForRoute(req);
  const admin = await requireAdmin(supabase);
  if (admin.error) {
    const status =
      admin.error === 'Unauthorized' ? 401 : admin.error === 'Forbidden' ? 403 : 500;
    return applyCookies(NextResponse.json({ error: admin.error }, { status }));
  }

  const body = await req.json().catch(() => ({}));
  const { id, title, description, question_type, config } = body;

  if (!id || !title?.trim() || !question_type) {
    return applyCookies(
      NextResponse.json(
        { error: 'id, title, and question_type are required' },
        { status: 400 }
      )
    );
  }

  const validQuestionTypes = ['definition', 'socratic', 'multiple_choice', 'short_answer'];
  if (!validQuestionTypes.includes(question_type)) {
    return applyCookies(
      NextResponse.json({ error: 'Invalid question_type' }, { status: 400 })
    );
  }

  const { data: template, error } = await supabase
    .from('assessment_module_templates')
    .update({
      title: title.trim(),
      description: description ?? null,
      question_type,
      config: config && typeof config === 'object' ? config : {},
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return applyCookies(NextResponse.json({ error: error.message }, { status: 400 }));
  }
  if (!template) {
    return applyCookies(NextResponse.json({ error: 'Not found' }, { status: 404 }));
  }
  return applyCookies(NextResponse.json({ success: true, template }));
}

export async function DELETE(req: NextRequest) {
  const { supabase, applyCookies } = createClientForRoute(req);
  const admin = await requireAdmin(supabase);
  if (admin.error) {
    const status =
      admin.error === 'Unauthorized' ? 401 : admin.error === 'Forbidden' ? 403 : 500;
    return applyCookies(NextResponse.json({ error: admin.error }, { status }));
  }

  const body = await req.json().catch(() => ({}));
  const { id } = body;
  if (!id) {
    return applyCookies(NextResponse.json({ error: 'id required' }, { status: 400 }));
  }

  const { error } = await supabase.from('assessment_module_templates').delete().eq('id', id);
  if (error) {
    return applyCookies(NextResponse.json({ error: error.message }, { status: 400 }));
  }
  return applyCookies(NextResponse.json({ success: true }));
}
