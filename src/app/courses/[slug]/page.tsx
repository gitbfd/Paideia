// src/app/courses/[slug]/page.tsx
// course detail shell
import { createClientServer } from '@/lib/supabase-server';
import LineNumberedContent from '@/components/LineNumberedContent';
import { htmlToGridRows, extractGridRowRange, type GridRow } from '@/lib/html-to-grid-rows';
import { generateTextPreviewStyles } from '@/lib/text-preview-styles';
import type { Metadata } from 'next';
import CourseSectionSidebar from '@/components/CourseSectionSidebar';

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
    const { data: profileData } = await supabase
      .from('profiles')
      .select('avatar_url, first_name, last_name')
      .eq('id', user.id)
      .single();
    profile = profileData ?? null;
  }

  // Fetch text sections for this course with display_content
  const { data: textSections, error: sectionsError } = await supabase
    .from('course_text_sections')
    .select(`
      id,
      start_line,
      end_line,
      title,
      order_index,
      text_documents (
        id,
        display_content,
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

  // Calculate total line count and character count for potential display
  const stats = (() => {
    if (!textSections || textSections.length === 0) {
      return { sectionCount: 0, lineCount: 0, charCount: 0 };
    }

    let totalLineCount = 0;
    let totalCharCount = 0;

    textSections.forEach((section) => {
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
      sectionCount: textSections.length,
      lineCount: totalLineCount,
      charCount: totalCharCount,
    };
  })();

  const sidebarSections =
    textSections?.map((section) => {
      const textDoc = section.text_documents as any;
      const text = textDoc?.texts as any;

      return {
        id: section.id,
        title: section.title || text?.title,
        textTitle: text?.title,
        startLine: section.start_line,
        endLine: section.end_line,
      };
    }) ?? [];

  return (
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
            {/* Display included texts */}
            {textSections && textSections.length > 0 ? (
              <div className="space-y-6">
              {textSections.map((section) => {
            const textDoc = section.text_documents as any;
            const text = textDoc?.texts as any;
            const displayContent = textDoc?.display_content;
            
            // Convert HTML to grid rows and extract the requested range
            let gridRows: GridRow[] = [];
            if (displayContent) {
              // Convert HTML to grid rows (handles <p> splitting and block elements)
              const allRows = htmlToGridRows(displayContent, 1);
              // Extract only the requested range
              gridRows = extractGridRowRange(allRows, section.start_line, section.end_line);
            }
            
              return (
                <div
                  key={section.id}
                  id={`section-${section.id}`}
                  className="bg-white rounded-lg shadow-sm border overflow-hidden"
                >
                <div className="p-4 border-b bg-gray-50">
                  <div className="font-semibold text-lg text-gray-900">
                    {section.title || text?.title || 'Untitled Section'}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {text?.title && (
                      <>
                        <span className="font-medium">{text.title}</span>
                        {text.author && <span> by {text.author}</span>}
                        {' • '}
                      </>
                    )}
                    {textDoc?.meta?.filename && (
                      <>
                        {textDoc.meta.filename}
                        {' • '}
                      </>
                    )}
                    Lines {section.start_line}–{section.end_line}
                  </div>
                </div>
                
                {gridRows.length > 0 ? (
                  <div className="bg-white">
                    <LineNumberedContent 
                      gridRows={gridRows}
                      startLine={section.start_line}
                    />
                  </div>
                ) : (
                  <div className="p-6 text-sm text-gray-500 italic">
                    Text content not available. This section may need to be re-ingested.
                  </div>
                )}
                </div>
              );
            })}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border p-6 text-center text-gray-500">
                No text sections available for this course.
              </div>
            )}
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: generateTextPreviewStyles() }} />
    </main>
  );
}
