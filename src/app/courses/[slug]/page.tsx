// src/app/courses/[slug]/page.tsx
// Course: header + sidebar + content each in own Suspense. Sidebar loads cached nav immediately.
import '@/styles/text-preview.css';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import CoursesPageScrollbar from '@/components/CoursesPageScrollbar';
import { createClientServer } from '@/lib/supabase/server';
import CourseHeader from './CourseHeader';
import CourseHeaderSkeleton from './CourseHeaderSkeleton';
import CourseSidebar from './CourseSidebar';
import CourseSidebarSkeleton from './CourseSidebarSkeleton';
import CourseContent from './CourseContent';
import CourseContentSkeleton from './CourseContentSkeleton';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const supabase = await createClientServer();
  const { slug } = await params;
  const { data: course } = await supabase
    .from('courses')
    .select('title')
    .eq('slug', slug)
    .single();
  return { title: course?.title || 'Course' };
}

export default async function CourseDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <>
      <CoursesPageScrollbar />
      <main className="min-h-screen bg-gray-50">
        <Suspense fallback={<CourseHeaderSkeleton />}>
          <CourseHeader slug={slug} />
        </Suspense>
        <div className="flex mt-6">
          <Suspense fallback={<CourseSidebarSkeleton />}>
            <CourseSidebar slug={slug} />
          </Suspense>
          <Suspense fallback={<CourseContentSkeleton />}>
            <CourseContent slug={slug} />
          </Suspense>
        </div>
      </main>
    </>
  );
}
