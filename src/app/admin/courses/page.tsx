// src/app/admin/courses/page.tsx
import Link from 'next/link';
import { createClientServer } from '@/lib/supabase/server';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Courses (Admin)',
};

export default async function AdminCourses() {
  const supabase = await createClientServer();

  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, slug, title, status, updated_at')
    .order('updated_at', { ascending: false });

  if (error) return <div className="p-6 text-red-600">Error: {error.message}</div>;

  return (
    <main className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Courses (Admin)</h1>
        <Link className="text-blue-600 hover:underline" href="/admin/courses/new">New</Link>
      </div>

      <ul className="space-y-2">
        {courses?.map((c) => (
          <li key={c.id} className="border p-4 rounded flex items-center justify-between">
            <div>
              <div className="font-medium">{c.title}</div>
              <div className="text-sm opacity-70">Status: {c.status}</div>
            </div>
            <Link className="text-blue-600 hover:underline" href={`/admin/courses/${c.slug}/edit`}>Edit</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
