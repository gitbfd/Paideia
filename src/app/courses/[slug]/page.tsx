// src/app/courses/[slug]/page.tsx
// course detail shell
import { createClientServer } from '@/lib/supabase-server';
import AskCourse from '@/components/AskCourse';

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

  return (
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{course.title}</h1>
        {course.description && <p>{course.description}</p>}
      </div>

      {/* RAG Ask UI */}
      <AskCourse courseId={course.id} />
    </main>
  );
}
