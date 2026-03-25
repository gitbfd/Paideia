// src/app/admin/courses/[slug]/edit/page.tsx
import Link from 'next/link';
import { createClientServer } from '@/lib/supabase/server';
import CourseEditForm from '@/components/CourseEditForm';
import AddTextSection from '@/components/AddTextSection';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const supabase = await createClientServer();
  const { slug } = await params;
  
  const { data: course } = await supabase
    .from('courses')
    .select('title, status')
    .eq('slug', slug)
    .single();

  const titlePrefix = course?.status === 'draft' 
    ? 'Edit DRAFT Course:' 
    : course?.status === 'published' 
    ? 'Edit PBLSHD Course:' 
    : 'Edit Course:';
  
  return {
    title: course ? `${titlePrefix} ${course.title}` : 'Edit Course',
  };
}

export default async function EditCourse({ params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createClientServer();
  const { slug } = await params;

  const { data: course, error } = await supabase
    .from('courses')
    .select('id, slug, title, description, status')
    .eq('slug', slug)
    .single();

  if (error) {
    return <div className="p-6 text-red-600">Error: {error.message}</div>;
  }
  if (!course) {
    return <div className="p-6">Course not found.</div>;
  }

  const headingPrefix = course.status === 'draft' 
    ? 'Edit DRAFT Course:' 
    : course.status === 'published' 
    ? 'Edit PBLSHD Course:' 
    : 'Edit Course:';

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{headingPrefix} {course.title}</h1>
        <div className="flex flex-col items-end gap-1 text-sm">
          <Link className="text-blue-600 hover:underline" href="/admin/courses">
            ← Back to Courses
          </Link>
          <Link
            className="text-blue-600 hover:underline"
            href={`/courses/${course.slug}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View Course
          </Link>
        </div>
      </div>

      <CourseEditForm course={course} />

      <div className="border-t pt-6">
        <AddTextSection courseSlug={course.slug} courseId={course.id} />
      </div>
    </main>
  );
}
