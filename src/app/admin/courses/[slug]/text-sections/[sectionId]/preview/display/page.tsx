import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import '@/styles/text-preview.css';
import LineNumberedContent from '@/components/LineNumberedContent';
import {
  htmlToGridRows,
  extractGridRowRange,
  filterBlockRowsByCharRange,
  htmlToBlockGridRowsWithChars,
  type GridRow,
  type BlockGridRowWithChars,
} from '@/lib/display/html';
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
    return { title: 'Section Display Preview' };
  }

  const { data: section } = await supabase
    .from('course_text_sections')
    .select('title')
    .eq('id', sectionId)
    .eq('course_id', course.id)
    .maybeSingle();

  const sectionTitle = section?.title ? ` • ${section.title}` : '';

  return {
    title: `${course.title} • Display Preview${sectionTitle}`,
  };
}

export default async function SectionDisplayPreviewPage({
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
          display_content,
          rag_text,
          source_type,
          meta,
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
  const displayContent: string | null = textDoc?.display_content ?? null;
  const ragText: string | null = textDoc?.rag_text ?? null;

  let gridRows: GridRow[] | null = null;
  let extractionWarning: string | null = null;

  if (displayContent) {
    const allBlockRows: BlockGridRowWithChars[] = htmlToBlockGridRowsWithChars(
      displayContent,
      ragText || undefined
    );

    const hasCharRange =
      ragText &&
      section.start_char !== null &&
      section.end_char !== null &&
      section.start_char >= 0 &&
      section.end_char > section.start_char;

    if (hasCharRange) {
      const subset = filterBlockRowsByCharRange(
        allBlockRows,
        section.start_char!,
        section.end_char!
      );

      if (subset.length > 0) {
        gridRows = subset;
      } else {
        extractionWarning =
          'Could not match the selected character range to block rows. Showing best-available content.';
      }
    }

    if (
      (!gridRows || gridRows.length === 0) &&
      section.start_line !== null &&
      section.end_line !== null &&
      section.start_line > 0 &&
      section.end_line >= section.start_line
    ) {
      const allRows = htmlToGridRows(displayContent, 1);
      gridRows = extractGridRowRange(allRows, section.start_line, section.end_line);
    }

    if (!gridRows || gridRows.length === 0) {
      gridRows = allBlockRows;
    }
  }

  const rangeLabel = formatRange(section);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="sticky top-0 bg-white border-b shadow-sm z-10 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500 uppercase tracking-wide">Display Preview</div>
            <h1 className="text-xl font-semibold text-gray-900">
              {section.title || textMeta?.title || 'Untitled Section'}
            </h1>
            <div className="text-sm text-gray-600">
              {course.title} • {textMeta?.title}
              {textMeta?.author && ` by ${textMeta.author}`} • {textDoc?.meta?.filename || 'Document'} •{' '}
              {rangeLabel}
            </div>
          </div>
          <Link href={`/admin/courses/${slug}/edit`} className="text-blue-600 hover:underline">
            ← Back to Course
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-4">
        {extractionWarning && (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded">
            {extractionWarning}
          </div>
        )}

        {!displayContent && (
          <div className="bg-white border rounded p-6 text-gray-600">
            Display content is not available for this section. Please re-ingest the document.
          </div>
        )}

        {displayContent && gridRows && gridRows.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <LineNumberedContent gridRows={gridRows} startLine={gridRows[0]?.lineNumber || 1} />
          </div>
        ) : (
          <div className="bg-white border rounded p-6 text-gray-600">
            Unable to render preview for this section. Try re-ingesting the document or redefining
            the section range.
          </div>
        )}
      </div>
    </main>
  );
}

