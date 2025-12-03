import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import EditSectionMetadataForm from '@/components/EditSectionMetadataForm';
import { createClientServer } from '@/lib/supabase/server';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; sectionId: string }>;
}): Promise<Metadata> {
  const supabase = await createClientServer();
  const { slug, sectionId } = await params;

  const { data: course } = await supabase
    .from('courses')
    .select('id, title')
    .eq('slug', slug)
    .single();

  if (!course) {
    return { title: 'Edit Section Metadata' };
  }

  const { data: section } = await supabase
    .from('course_text_sections')
    .select('title')
    .eq('id', sectionId)
    .eq('course_id', course.id)
    .maybeSingle();

  const sectionTitle = section?.title ? ` • ${section.title}` : '';

  return {
    title: `${course.title} • Edit Section${sectionTitle}`,
  };
}

export default async function EditSectionMetadataPage({
  params,
}: {
  params: Promise<{ slug: string; sectionId: string }>;
}) {
  const supabase = await createClientServer();
  const { slug, sectionId } = await params;

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, title')
    .eq('slug', slug)
    .single();

  if (courseError || !course) {
    return notFound();
  }

  const { data: section, error: sectionError } = await supabase
    .from('course_text_sections')
    .select(
      `
        id,
        title,
        start_char,
        end_char,
        start_line,
        end_line,
        text_documents (
          id,
          meta,
          texts (
            id,
            title,
            author
          )
        )
      `
    )
    .eq('id', sectionId)
    .eq('course_id', course.id)
    .single();

  if (sectionError || !section) {
    return notFound();
  }

  const textDoc = section.text_documents as any;
  const textMeta = textDoc?.texts as any;

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto bg-white border rounded shadow-sm">
        <div className="border-b p-4">
          <div className="text-sm text-gray-500 uppercase tracking-wide">Edit Metadata</div>
          <h1 className="text-xl font-semibold text-gray-900">
            {section.title || textMeta?.title || 'Untitled Section'}
          </h1>
          <div className="text-sm text-gray-600">
            {course.title} • {textMeta?.title}
            {textMeta?.author && ` by ${textMeta.author}`} •{' '}
            {textDoc?.meta?.filename || 'Document'}
          </div>
        </div>

        <div className="p-4 space-y-4">
          <EditSectionMetadataForm
            courseSlug={slug}
            sectionId={section.id}
            initialTitle={section.title ?? null}
          />

          <div className="text-sm">
            <Link href={`/admin/courses/${slug}/edit`} className="text-blue-600 hover:underline">
              ← Back to Course
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

