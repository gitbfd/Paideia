// courses/page.tsx
// List published courses
import Link from 'next/link';
import { createClientServer } from '@/lib/supabase-server';

export default async function CoursesPage() {
  const supabase = await createClientServer();

  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, slug, title, description, published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (error) return <div className="p-6 text-red-600">Error: {error.message}</div>;

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Courses</h1>
      <ul className="space-y-2">
        {courses?.map((c) => (
          <li key={c.id} className="border p-4 rounded">
            <Link href={`/courses/${c.slug}`} className="text-blue-600 hover:underline">
              {c.title}
            </Link>
            {c.description ? <p className="text-sm text-gray-600">{c.description}</p> : null}
          </li>
        ))}
      </ul>
    </main>
  );
}
