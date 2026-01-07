// src/app/courses/[slug]/page.tsx
// course detail shell
import { createClientServer } from '@/lib/supabase/server';
import LineNumberedContent from '@/components/LineNumberedContent';
import {
  htmlToGridRows,
  extractGridRowRange,
  filterBlockRowsByCharRange,
  htmlToBlockGridRowsWithChars,
  type GridRow,
  type BlockGridRowWithChars,
} from '@/lib/display/html';
import '@/styles/text-preview.css';
import type { Metadata } from 'next';
import CourseSectionSidebar from '@/components/CourseSectionSidebar';
import AssessmentModule from '@/components/AssessmentModule';
import CoursesPageScrollbar from '@/components/CoursesPageScrollbar';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const supabase = await createClientServer();
  const { slug } = await params;
  
  const { data: course } = await supabase
    .from('courses')
    .select('title')
    .eq('slug', slug)
    .single();

  return {
    title: course?.title || 'Course',
  };
}

export default async function CourseDetail({ params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createClientServer();
  const { slug } = await params;

  const { data: course, error } = await supabase
    .from('courses')
    .select('id, title, description, status, published_at')
    .eq('slug', slug)
    .single();

  if (error) return <div className="p-6 text-red-600">Error: {error.message}</div>;
  if (!course) return <div className="p-6">Not found.</div>;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile:
    | {
        avatar_url: string | null;
        first_name: string | null;
        last_name: string | null;
      }
    | null = null;

  if (user) {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('avatar_url, first_name, last_name')
      .eq('id', user.id)
      .maybeSingle(); // Use maybeSingle() instead of single() to handle missing profiles gracefully
    
    if (profileError) {
      console.error('[courses/[slug]] Error fetching profile:', profileError);
    }
    
    profile = profileData ?? null;
  }

  // Fetch text sections for this course with display_content
  // Note: Requires RLS policy "texts_read_for_published_courses" to be applied
  // See migration: 20251203_1200--allowPublicReadTextsForPublishedCourses.sql
  const { data: textSections, error: sectionsError } = await supabase
    .from('course_text_sections')
    .select(`
      id,
      start_line,
      end_line,
      start_char,
      end_char,
      title,
      order_index,
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
    `)
    .eq('course_id', course.id)
    .order('order_index', { ascending: true });

  if (sectionsError) {
    console.error('[courses/[slug]] Error fetching text sections:', sectionsError);
  }

  // Fetch assessment modules for this course
  const { data: assessmentModules, error: modulesError } = await supabase
    .from('assessment_modules')
    .select(`
      id,
      title,
      description,
      question_type,
      order_index,
      config
    `)
    .eq('course_id', course.id)
    .order('order_index', { ascending: true });

  if (modulesError) {
    console.error('[courses/[slug]] Error fetching assessment modules:', modulesError);
  }

  // Filter out invalid sections first to ensure stable array length for hydration
  // Ensure section.id is a valid non-null string to prevent hydration mismatches
  const validSections = (textSections || []).filter(
    (section) => section && section.id && typeof section.id === 'string' && section.id.length > 0
  );

  // Calculate total line count and character count for potential display
  const stats = (() => {
    if (!validSections || validSections.length === 0) {
      return { sectionCount: 0, lineCount: 0, charCount: 0 };
    }

    let totalLineCount = 0;
    let totalCharCount = 0;

    validSections.forEach((section) => {
      const textDoc = section.text_documents as any;
      const displayContent = textDoc?.display_content;

      if (displayContent) {
        const allRows = htmlToGridRows(displayContent, 1);
        const sectionRows = extractGridRowRange(allRows, section.start_line, section.end_line);
        totalLineCount += sectionRows.length;
        totalCharCount += displayContent.length;
      }
    });

    return {
      sectionCount: validSections.length,
      lineCount: totalLineCount,
      charCount: totalCharCount,
    };
  })();

  // Process sections asynchronously to extract content
  const processedSections: Array<{
    section: any;
    textDoc: any;
    text: any;
    gridRows: GridRow[] | null;
    useCharacterBased: boolean;
  }> = validSections.length > 0
    ? await Promise.all(
        validSections.map(async (section) => {
          const textDoc = section.text_documents as any;
          // Handle both array and object formats from Supabase
          const text = Array.isArray(textDoc?.texts) ? textDoc?.texts[0] : textDoc?.texts;
          const displayContent = textDoc?.display_content;
          const ragText = textDoc?.rag_text;
          
          let gridRows: GridRow[] | null = null;
          let useCharacterBased = false;

          const hasCharRange =
            displayContent &&
            ragText &&
            section.start_char !== null &&
            section.end_char !== null &&
            typeof section.start_char === 'number' &&
            typeof section.end_char === 'number';

          if (hasCharRange) {
            try {
              const allBlockRows: BlockGridRowWithChars[] = htmlToBlockGridRowsWithChars(
                displayContent!,
                ragText!
              );
              const subset = filterBlockRowsByCharRange(
                allBlockRows,
                section.start_char!,
                section.end_char!
              );
              if (subset.length > 0) {
                gridRows = subset;
                useCharacterBased = true;
              }
            } catch (err) {
              console.error(`[course-display] Block filtering failed for section ${section.id}:`, err);
            }
          }

          if (
            (!gridRows || gridRows.length === 0) &&
            displayContent &&
            section.start_line &&
            section.end_line
          ) {
            const allRows = htmlToGridRows(displayContent, 1);
            gridRows = extractGridRowRange(allRows, section.start_line, section.end_line);
            useCharacterBased = false;
          }

          if (!gridRows && displayContent) {
            gridRows = htmlToGridRows(displayContent, 1);
            useCharacterBased = false;
          }

          return {
            section,
            textDoc,
            text,
            gridRows,
            useCharacterBased,
          };
        })
      )
    : [];

  // Combine text sections and assessment modules for sidebar
  const sidebarSections = [
    ...(textSections?.map((section) => {
      const textDoc = section.text_documents as any;
      // Handle both array and object formats from Supabase
      // For one-to-one relationships, Supabase returns an object, not an array
      const text = Array.isArray(textDoc?.texts) ? textDoc?.texts[0] : (textDoc?.texts || null);
      
      return {
        id: section.id,
        type: 'text_section' as const,
        sectionTitle: section.title || null,
        textTitle: text?.title || null,
        textAuthor: text?.author || null,
        order_index: section.order_index,
      };
    }) ?? []),
    ...(assessmentModules?.map((module) => ({
      id: module.id,
      type: 'assessment_module' as const,
      sectionTitle: module.title,
      textTitle: null,
      textAuthor: null,
      order_index: module.order_index,
    })) ?? []),
  ].sort((a, b) => a.order_index - b.order_index);

  return (
    <>
      <CoursesPageScrollbar />
      <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b shadow-sm p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{course.title}</h1>
            <div className="text-sm text-gray-600">
              {course.description}
            </div>
            <div
              className="sr-only"
              dangerouslySetInnerHTML={{
                __html: `<!-- ${stats.sectionCount.toLocaleString()} section${stats.sectionCount !== 1 ? 's' : ''} • ${stats.lineCount.toLocaleString()} lines • ${stats.charCount.toLocaleString()} characters -->`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex mt-6">
        {sidebarSections.length > 0 && (
          <div className="flex-shrink-0 mr-6">
            <CourseSectionSidebar
              sections={sidebarSections}
              courseTitle={course.title}
              courseDescription={course.description}
              stats={stats}
              avatarUrl={profile?.avatar_url ?? null}
              profileName={
                profile
                  ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || null
                  : null
              }
            />
          </div>
        )}
        <div className="flex-1">
          <div className="max-w-7xl mx-auto pr-6 pb-4">
            {/* Display included texts and assessment modules */}
            {(() => {
              // Create unified list of items (text sections + assessment modules) sorted by order_index
              type CourseItem = 
                | { type: 'text_section'; data: typeof processedSections[0]; order_index: number }
                | { type: 'assessment_module'; data: NonNullable<typeof assessmentModules>[0]; order_index: number };

              const allItems: CourseItem[] = [
                ...processedSections.map((item) => ({
                  type: 'text_section' as const,
                  data: item,
                  order_index: item.section.order_index,
                })),
                ...(assessmentModules || []).map((module) => ({
                  type: 'assessment_module' as const,
                  data: module,
                  order_index: module.order_index,
                })),
              ].sort((a, b) => a.order_index - b.order_index);

              if (allItems.length === 0) {
                return (
                  <div className="bg-white rounded-lg shadow-sm border p-6 text-center text-gray-500">
                    No content available for this course.
                  </div>
                );
              }

              return (
                <div className="space-y-6">
                  {allItems.map((item) => {
                    if (item.type === 'text_section') {
                      const { section, textDoc, text, gridRows } = item.data;
                      if (!section?.id || typeof section.id !== 'string' || section.id.length === 0) {
                        return null;
                      }

                      const sectionId = String(section.id);
                      
                      return (
                        <div
                          key={`text-${sectionId}`}
                          id={`section-${sectionId}`}
                          className="bg-white rounded-lg shadow-sm border overflow-hidden"
                        >
                          <div className="p-4 border-b bg-gray-50">
                            <div className="font-semibold text-lg text-gray-900">
                              {text?.title || 'Untitled Text'}
                              {text?.author && (
                                <span className="text-gray-600 font-normal">
                                  {' by '}
                                  {text.author}
                                </span>
                              )}
                            </div>
                            {section.title && (
                              <div className="text-sm text-gray-600 mt-1">
                                {section.title}
                              </div>
                            )}
                          </div>
                          
                          {gridRows && Array.isArray(gridRows) && gridRows.length > 0 ? (
                            <div className="bg-white">
                              <LineNumberedContent 
                                gridRows={gridRows}
                                startLine={gridRows[0]?.lineNumber || 1}
                              />
                            </div>
                          ) : (
                            <div className="p-6 text-sm text-gray-500 italic">
                              Text content not available. This section may need to be re-ingested.
                            </div>
                          )}
                        </div>
                      );
                    } else {
                      // Assessment Module
                      const module = item.data;
                      const moduleId = String(module.id);
                      
                      return (
                        <div
                          key={`am-${moduleId}`}
                          id={`assessment-module-${moduleId}`}
                        >
                          <AssessmentModule courseSlug={slug} moduleId={moduleId} />
                        </div>
                      );
                    }
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </main>
    </>
  );
}
