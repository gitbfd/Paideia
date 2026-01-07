import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { createClientServer } from '@/lib/supabase/server';

function formatRange(section: {
  start_char: number | null;
  end_char: number | null;
  start_line: number | null;
  end_line: number | null;
}) {
  if (
    section.start_char !== null &&
    section.end_char !== null &&
    section.start_char >= 0 &&
    section.end_char > section.start_char
  ) {
    return `Chars ${section.start_char.toLocaleString()}-${section.end_char.toLocaleString()}`;
  }

  if (
    section.start_line !== null &&
    section.end_line !== null &&
    section.start_line > 0 &&
    section.end_line >= section.start_line
  ) {
    return `Lines ${section.start_line}-${section.end_line}`;
  }

  return 'Full document';
}

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
    return { title: 'Section RAG Preview' };
  }

  const { data: section } = await supabase
    .from('course_text_sections')
    .select('title')
    .eq('id', sectionId)
    .eq('course_id', course.id)
    .maybeSingle();

  const sectionTitle = section?.title ? ` • ${section.title}` : '';

  return {
    title: `${course.title} • RAG Preview${sectionTitle}`,
  };
}

export default async function SectionRagPreviewPage({
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
        text_document_id,
        text_documents (
          id,
          text_id,
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
  const hasCharRange =
    section.start_char !== null &&
    section.end_char !== null &&
    section.start_char >= 0 &&
    section.end_char > section.start_char;

  if (!hasCharRange) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto bg-white border rounded p-6">
          <h1 className="text-xl font-semibold text-gray-900 mb-3">RAG Preview</h1>
          <p className="text-gray-700">
            This section does not have character positions yet. Please re-create the section using the
            block selector so we can map it to specific RAG chunks.
          </p>
          <Link href={`/admin/courses/${slug}/edit`} className="text-blue-600 hover:underline mt-4 inline-block">
            ← Back to Course
          </Link>
        </div>
      </main>
    );
  }

  const { data: chunks, error: chunksError } = await supabase
    .from('text_document_chunks')
    .select('chunk_index, content, start_char, end_char')
    .eq('document_id', section.text_document_id)
    .gte('end_char', section.start_char)
    .lte('start_char', section.end_char)
    .order('chunk_index', { ascending: true });

  if (chunksError) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto bg-white border rounded p-6">
          <div className="text-red-600">Error loading RAG data: {chunksError.message}</div>
          <Link href={`/admin/courses/${slug}/edit`} className="text-blue-600 hover:underline mt-4 inline-block">
            ← Back to Course
          </Link>
        </div>
      </main>
    );
  }

  const rangeLabel = formatRange(section);

  return (
    <main className="bg-gray-50">
      <div className="sticky top-0 bg-white border-b shadow-sm z-10 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500 uppercase tracking-wide">RAG Preview</div>
            <h1 className="text-xl font-semibold text-gray-900">
              {section.title || textMeta?.title || 'Untitled Section'}
            </h1>
            <div className="text-sm text-gray-600">
              {course.title} • {textMeta?.title}
              {textMeta?.author && ` by ${textMeta.author}`} • {rangeLabel}
            </div>
          </div>
          <Link href={`/admin/courses/${slug}/edit`} className="text-blue-600 hover:underline">
            ← Back to Course
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-4">
        {(!chunks || chunks.length === 0) && (
          <div className="bg-white border rounded p-6 text-gray-600">
            No RAG chunks overlap this section. Consider re-ingesting the document or adjusting the
            block selection.
          </div>
        )}

        {chunks &&
          chunks.length > 0 &&
          chunks.map((chunk) => {
            const chunkCharCount = chunk.content?.length ?? 0;
            const startChar = chunk.start_char ?? 0;
            const endChar = chunk.end_char ?? startChar + chunkCharCount;

            const overlapsStart = Math.max(startChar, section.start_char!);
            const overlapsEnd = Math.min(endChar, section.end_char!);

            return (
              <div key={chunk.chunk_index} className="bg-white border rounded p-4 shadow-sm">
                <div className="text-sm font-medium text-gray-600 mb-1">
                  Chunk {chunk.chunk_index + 1} • Chars {startChar.toLocaleString()}-
                  {endChar.toLocaleString()} ({chunkCharCount.toLocaleString()} chars)
                </div>
                <div className="text-xs text-gray-500 mb-3">
                  Overlap with section: Chars {overlapsStart.toLocaleString()}-
                  {overlapsEnd.toLocaleString()}
                </div>
                <pre className="whitespace-pre-wrap font-serif leading-relaxed text-gray-900">
                  {chunk.content}
                </pre>
              </div>
            );
          })}
      </div>
    </main>
  );
}

