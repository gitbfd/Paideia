// src/app/admin/assessment-modules/page.tsx
import Link from 'next/link';
import { createClientServer } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import DeleteAssessmentModuleButton from '@/components/DeleteAssessmentModuleButton';

export const metadata: Metadata = {
  title: 'Assessment Modules (Admin)',
};

export const dynamic = 'force-dynamic';

export default async function AssessmentModules() {
  try {
    const supabase = await createClientServer();

    const { data: modules, error } = await supabase
      .from('assessment_modules')
      .select(`
        id,
        title,
        description,
        question_type,
        order_index,
        course_id,
        courses (
          id,
          title,
          slug
        ),
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });

    if (error) return <div className="p-6 text-red-600">Error: {error.message}</div>;

    return (
      <main className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Assessment Modules (Admin)</h1>
          <Link className="text-blue-600 hover:underline" href="/admin/assessment-modules/new">New</Link>
        </div>

        <ul className="space-y-2">
          {modules?.map((module) => (
            <li key={module.id} className="border p-4 rounded flex items-center justify-between">
              <div>
                <div className="font-medium">{module.title}</div>
                <div className="text-sm opacity-70">
                  {module.description && `${module.description} • `}
                  Type: {module.question_type}
                  {module.courses && ` • Course: ${(module.courses as any).title}`}
                  {module.order_index !== null && ` • Order: ${module.order_index}`}
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <Link 
                  className="text-blue-600 hover:underline" 
                  href={`/admin/assessment-modules/${module.id}/edit`}
                >
                  Edit
                </Link>
                <span className="text-gray-300">|</span>
                <DeleteAssessmentModuleButton 
                  moduleId={module.id} 
                  moduleTitle={module.title}
                />
              </div>
            </li>
          ))}
          {modules?.length === 0 && (
            <li className="border p-4 rounded text-gray-500 text-center">
              No assessment modules yet. Create one to get started.
            </li>
          )}
        </ul>
      </main>
    );
  } catch (error: any) {
    console.error('AssessmentModules error:', error);
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

