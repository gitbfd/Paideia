// src/app/courses/[slug]/CourseSidebar.tsx
// Sidebar with cached course + layout. Profile streams in via nested Suspense.

import { Suspense } from 'react';
import {
  getCachedCourse,
  getCachedCourseLayout,
  type SectionForSidebar,
  type ModuleForSidebar,
} from '@/lib/courses/course-data';
import CourseSectionSidebar from '@/components/CourseSectionSidebar';
import {
  SidebarAvatarLoader,
  SidebarAvatarSkeleton,
} from '@/components/SidebarAvatar';

type Props = { slug: string };

export default async function CourseSidebar({ slug }: Props) {
  const course = await getCachedCourse(slug);
  const layout = course
    ? await getCachedCourseLayout(course.id, slug)
    : null;

  if (!course) return null;
  if (!layout) return null;

  const sidebarSections = [
    ...layout.sections.map((s: SectionForSidebar) => ({
      id: s.id,
      type: 'text_section' as const,
      sectionTitle: s.title,
      textTitle: s.textTitle,
      textAuthor: s.textAuthor,
      order_index: s.order_index,
    })),
    ...layout.modules.map((m: ModuleForSidebar) => ({
      id: m.id,
      type: 'assessment_module' as const,
      sectionTitle: m.title,
      textTitle: null as string | null,
      textAuthor: null as string | null,
      order_index: m.order_index,
    })),
  ].sort((a, b) => a.order_index - b.order_index);

  if (sidebarSections.length === 0) return null;

  return (
    <div className="flex-shrink-0 mr-6">
      <CourseSectionSidebar
        sections={sidebarSections}
        courseTitle={course.title}
        courseDescription={course.description}
        stats={layout.stats}
        profileSlot={
          <Suspense fallback={<SidebarAvatarSkeleton />}>
            <SidebarAvatarLoader />
          </Suspense>
        }
      />
    </div>
  );
}
