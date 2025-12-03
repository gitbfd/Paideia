// src/app/admin/texts/page.tsx
import Link from 'next/link';
import { createClientServer } from '@/lib/supabase/server';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Texts (Admin)',
};

export default async function AdminTexts() {
  try {
    const supabase = await createClientServer();

    const { data: texts, error } = await supabase
      .from('texts')
      .select('id, title, author, publication_date, updated_at')
      .order('updated_at', { ascending: false });

    if (error) return <div className="p-6 text-red-600">Error: {error.message}</div>;

    return (
      <main className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Texts (Admin)</h1>
          <Link className="text-blue-600 hover:underline" href="/admin/texts/new">New</Link>
        </div>

        <ul className="space-y-2">
          {texts?.map((text) => (
            <li key={text.id} className="border p-4 rounded flex items-center justify-between">
              <div>
                <div className="font-medium">{text.title}</div>
                <div className="text-sm opacity-70">
                  {text.author && `Author: ${text.author}`}
                  {text.publication_date && ` • Published: ${text.publication_date}`}
                </div>
              </div>
              <Link className="text-blue-600 hover:underline" href={`/admin/texts/${text.id}/edit`}>Edit</Link>
            </li>
          ))}
          {texts?.length === 0 && (
            <li className="border p-4 rounded text-gray-500 text-center">No texts yet. Create one to get started.</li>
          )}
        </ul>
      </main>
    );
  } catch (error: any) {
    console.error('AdminTexts error:', error);
    return (
      <main className="p-6">
        <div className="text-red-600">
          <h1 className="text-2xl font-semibold mb-2">Internal Server Error</h1>
          <p>{error?.message || 'An unexpected error occurred'}</p>
          {process.env.NODE_ENV === 'development' && error?.stack && (
            <pre className="mt-4 text-xs overflow-auto">{error.stack}</pre>
          )}
        </div>
      </main>
    );
  }
}

