// src/lib/courses/course-data.ts
// Cached data fetchers for course page. Invalidate via revalidateTag when admin edits.

import { unstable_cache } from 'next/cache';
import { createClientAdmin } from '@/lib/supabase/admin';
import { createClientServer } from '@/lib/supabase/server';
import { htmlToBlockGridRowsWithChars, type GridRow } from '@/lib/display/html';

export type CourseRecord = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  published_at: string | null;
};

export type SectionForSidebar = {
  id: string;
  title: string | null;
  order_index: number;
  textTitle: string | null;
  textAuthor: string | null;
  text_document_id?: string;
  start_block?: number;
  end_block?: number;
};

export type ModuleForSidebar = {
  id: string;
  title: string;
  order_index: number;
};

export type CourseLayoutData = {
  sections: SectionForSidebar[];
  modules: ModuleForSidebar[];
  stats: { sectionCount: number; blockCount: number };
};

/** Cached: course by slug. Invalidates when course details edited. */
export async function getCachedCourse(slug: string): Promise<CourseRecord | null> {
  const fn = unstable_cache(
    async (s: string) => {
      const supabase = createClientAdmin();
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, description, status, published_at')
        .eq('slug', s)
        .single();
      if (error || !data) return null;
      return data as CourseRecord;
    },
    ['course', slug],
    { tags: [`course-slug-${slug}`], revalidate: false }
  );
  return fn(slug);
}

/** Cached: sidebar data (sections + modules, no display content). Invalidates when course structure changes. */
export async function getCachedCourseLayout(
  courseId: string,
  slug: string
): Promise<CourseLayoutData | null> {
  const fn = unstable_cache(
    async (cid: string) => {
      const supabase = createClientAdmin();
      const { data: sections } = await supabase
        .from('course_text_sections')
        .select(
          `
          id,
          title,
          order_index,
          start_block,
          end_block,
          text_document_id,
          text_documents (
            id,
            texts (
              title,
              author
            )
          )
        `
        )
        .eq('course_id', cid)
        .order('order_index', { ascending: true });

      const { data: modules } = await supabase
        .from('assessment_modules')
        .select('id, title, order_index')
        .eq('course_id', cid)
        .order('order_index', { ascending: true });

      const validSections = (sections || []).filter(
        (s) => s && s.id && typeof s.id === 'string'
      );

      let totalBlocks = 0;
      validSections.forEach((s) => {
        const start = s.start_block ?? 0;
        const end = s.end_block ?? 0;
        if (start && end && end >= start) totalBlocks += end - start + 1;
      });

      const sectionList: SectionForSidebar[] = (sections || []).map((s) => {
        const td = s.text_documents as any;
        const text = Array.isArray(td?.texts) ? td?.texts[0] : td?.texts;
        return {
          id: s.id,
          title: s.title ?? null,
          order_index: s.order_index ?? 0,
          textTitle: text?.title ?? null,
          textAuthor: text?.author ?? null,
          text_document_id: s.text_document_id ?? td?.id,
          start_block: s.start_block ?? undefined,
          end_block: s.end_block ?? undefined,
        };
      });

      const moduleList: ModuleForSidebar[] = (modules || []).map((m) => ({
        id: m.id,
        title: m.title,
        order_index: m.order_index ?? 0,
      }));

      return {
        sections: sectionList,
        modules: moduleList,
        stats: { sectionCount: validSections.length, blockCount: totalBlocks },
      };
    },
    ['course-layout', courseId],
    { tags: [`course-${courseId}`, `course-slug-${slug}`], revalidate: false }
  );
  return fn(courseId);
}

/** Cached: single section's display grid rows. Invalidates when text_document is re-ingested. */
export async function getCachedSectionGridRows(
  textDocumentId: string,
  startBlock: number,
  endBlock: number
): Promise<GridRow[]> {
  const fn = unstable_cache(
    async (docId: string, start: number, end: number) => {
      const supabase = createClientAdmin();
      const { data: doc } = await supabase
        .from('text_documents')
        .select('display_grid_rows, display_content')
        .eq('id', docId)
        .single();

      if (!doc) return [];

      const stored = doc.display_grid_rows as GridRow[] | null;
      const displayContent = doc.display_content as string | null;

      let allRows: GridRow[];
      if (Array.isArray(stored) && stored.length > 0) {
        allRows = stored;
      } else if (displayContent) {
        try {
          allRows = htmlToBlockGridRowsWithChars(displayContent);
        } catch {
          return [];
        }
      } else {
        return [];
      }

      if (
        typeof start === 'number' &&
        typeof end === 'number' &&
        start >= 1 &&
        end >= start
      ) {
        const startIdx = start - 1;
        const endIdx = Math.min(end, allRows.length);
        return allRows.slice(startIdx, endIdx);
      }
      return allRows;
    },
    ['section-grid', textDocumentId, String(startBlock), String(endBlock)],
    {
      tags: [`text-document-${textDocumentId}`],
      revalidate: 3600, // 1h fallback if ingest doesn't call revalidateTag
    }
  );
  return fn(textDocumentId, startBlock, endBlock);
}

/** Request-scoped: user profile. Not cached across users. */
export async function getProfile() {
  const supabase = await createClientServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('avatar_url, first_name, last_name')
    .eq('id', user.id)
    .maybeSingle();
  return data;
}
