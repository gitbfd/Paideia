// src/app/courses/[slug]/CourseContent.tsx
// Main content area: section items load lazily. Layout is cached.

import { Suspense } from 'react';
import {
  getCachedCourse,
  getCachedCourseLayout,
  type SectionForSidebar,
  type ModuleForSidebar,
} from '@/lib/courses/course-data';
import AssessmentModuleWrapper from '@/components/AssessmentModuleWrapper';
import SectionContentItem from './SectionContentItem';
import ContentItemSkeleton from './ContentItemSkeleton';

type Props = { slug: string };

type ContentItem =
  | { type: 'text_section'; data: SectionForSidebar; order_index: number }
  | { type: 'assessment_module'; data: ModuleForSidebar; order_index: number };

export default async function CourseContent({ slug }: Props) {
  const course = await getCachedCourse(slug);
  const layout = course ? await getCachedCourseLayout(course.id, slug) : null;

  if (!course) return <div className="p-6 text-red-600">Course not found.</div>;
  if (!layout) return <div className="p-6 text-red-600">Failed to load layout.</div>;

  const contentItems: ContentItem[] = [
    ...layout.sections
      .filter((s) => s.id && typeof s.id === 'string')
      .map((s) => ({ type: 'text_section' as const, data: s, order_index: s.order_index })),
    ...layout.modules.map((m) => ({
      type: 'assessment_module' as const,
      data: m,
      order_index: m.order_index,
    })),
  ].sort((a, b) => a.order_index - b.order_index);

  if (contentItems.length === 0) {
    return (
      <div className="flex-1">
        <div className="max-w-7xl mx-auto pr-6 pb-4">
          <div className="bg-white rounded-lg shadow-sm border p-6 text-center text-gray-500">
            No content available for this course.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <div className="max-w-7xl mx-auto pr-6 pb-4">
        <div className="space-y-6">
          {contentItems.map((item) => (
            <Suspense
              key={
                item.type === 'text_section'
                  ? `text-${item.data.id}`
                  : `am-${item.data.id}`
              }
              fallback={<ContentItemSkeleton />}
            >
              {item.type === 'text_section' ? (
                <SectionContentItem section={item.data} />
              ) : (
                <div
                  id={`assessment-module-${item.data.id}`}
                  className="bg-white rounded-lg shadow-sm border overflow-hidden"
                >
                  <Suspense
                    fallback={
                      <div className="p-6 text-sm text-gray-500">
                        Loading assessment...
                      </div>
                    }
                  >
                    <AssessmentModuleWrapper
                      courseSlug={slug}
                      moduleId={String(item.data.id)}
                    />
                  </Suspense>
                </div>
              )}
            </Suspense>
          ))}
        </div>
      </div>
    </div>
  );
}
