// src/app/admin/courses/published/page.tsx
import Link from 'next/link';
import { createClientServer } from '@/lib/supabase-server';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Published Courses (Admin)',
};

export default async function PublishedCourses() {
  const supabase = await createClientServer();

  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, slug, title, status, published_at, updated_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (error) return <div className="p-6 text-red-600">Error: {error.message}</div>;

  return (
    <main className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Published Courses (Admin)</h1>
        <Link className="text-blue-600 hover:underline" href="/admin/courses/new">New</Link>
      </div>

      <ul className="space-y-2">
        {courses?.map((c) => (
          <li key={c.id} className="border p-4 rounded flex items-center justify-between">
            <div>
              <div className="font-medium">{c.title}</div>
              <div className="text-sm opacity-70">
                Status: {c.status}
                {c.published_at && ` • Published: ${new Date(c.published_at).toLocaleDateString()}`}
              </div>
            </div>
            <Link className="text-blue-600 hover:underline" href={`/admin/courses/${c.slug}/edit`}>Edit</Link>
          </li>
        ))}
        {courses?.length === 0 && (
          <li className="border p-4 rounded text-gray-500 text-center">No published courses yet.</li>
        )}
      </ul>
    </main>
  );
}

