// src/app/admin/courses/[id]/edit/page.tsx

import Link from 'next/link';
import { createClientServer } from '@/lib/supabase-server';

import CourseUploader from '@/components/CourseUploader';

export default async function EditCourse({ params }: { params: { id: string } }) {
  const supabase = await createClientServer();
  const { data: course, error } = await supabase
    .from('courses')
    .select('id, title, description, status')
    .eq('id', params.id)
    .single();

  if (error) return <div className="p-6 text-red-600">Error: {error.message}</div>;
  if (!course) return <div className="p-6">Not found.</div>;

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Edit: {course.title}</h1>

      {/* For brevity, link to publish; you can add a full form later */}
      {course.status !== 'published' && (
        <form action={`/api/admin/courses/${course.id}/publish`} method="post">
          <button className="border px-4 py-2 rounded" formMethod="PATCH">Publish</button>
        </form>
      )}

      <div className="pt-4">
        <h2 className="font-medium">Documents</h2>
        <p className="text-sm text-gray-600">Upload to Storage bucket <code>course-docs/{course.id}/filename.pdf</code> then register below.</p>
        <Link className="text-blue-600 hover:underline" href="/admin/courses">Back to list</Link>
      </div>
      {/* BFD added */}
      <div className="pt-4 space-y-3">
        <h2 className="font-medium">Documents</h2>
        <p className="text-sm text-gray-600">
          Files are stored privately in <code>course-docs/{course.id}/…</code>.
        </p>
        <CourseUploader courseId={course.id} />
      </div>

    </main>
  );
}
