// src/app/admin/courses/[slug]/edit/page.tsx
import Link from 'next/link';
import { createClientServer } from '@/lib/supabase-server';
import CourseEditForm from '@/components/CourseEditForm';
import AddTextSection from '@/components/AddTextSection';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const supabase = await createClientServer();
  const { slug } = await params;
  
  const { data: course } = await supabase
    .from('courses')
    .select('title')
    .eq('slug', slug)
    .single();

  return {
    title: course ? `Edit: ${course.title}` : 'Edit Course',
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

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Edit: {course.title}</h1>
        <Link className="text-blue-600 hover:underline" href="/admin/courses">← Back to Courses</Link>
      </div>

      <CourseEditForm course={course} />

      <div className="border-t pt-6">
        <AddTextSection courseSlug={course.slug} />
      </div>
    </main>
  );
}
