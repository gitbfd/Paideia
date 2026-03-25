import Link from 'next/link';
import { createClientServer } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import DeleteAssessmentTemplateButton from '@/components/DeleteAssessmentTemplateButton';

export const metadata: Metadata = {
  title: 'Assessment Module Templates (Admin)',
};

export const dynamic = 'force-dynamic';

export default async function AssessmentModuleTemplatesPage() {
  const supabase = await createClientServer();
  const { data: templates, error } = await supabase
    .from('assessment_module_templates')
    .select('id, title, description, question_type, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    return <div className="p-6 text-red-600">Error: {error.message}</div>;
  }

  return (
    <main className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Assessment module templates</h1>
        <Link className="text-blue-600 hover:underline" href="/admin/assessment-module-templates/new">
          New template
        </Link>
      </div>
      <p className="text-sm text-gray-600 max-w-2xl">
        Templates are reusable blueprints. Add an assessment module to a course from the course
        editor; optionally start from a template there.
      </p>

      <ul className="space-y-2">
        {templates?.map((t) => (
          <li
            key={t.id}
            className="border p-4 rounded flex items-center justify-between gap-4"
          >
            <div>
              <div className="font-medium">{t.title}</div>
              <div className="text-sm opacity-70">
                {t.description && `${t.description} • `}
                Type: {t.question_type}
              </div>
            </div>
            <div className="flex gap-2 items-center flex-shrink-0">
              <Link
                className="text-blue-600 hover:underline"
                href={`/admin/assessment-module-templates/${t.id}/edit`}
              >
                Edit
              </Link>
              <span className="text-gray-300">|</span>
              <DeleteAssessmentTemplateButton templateId={t.id} templateTitle={t.title} />
            </div>
          </li>
        ))}
        {templates?.length === 0 && (
          <li className="border p-4 rounded text-gray-500 text-center">
            No templates yet. Create one to reuse across courses.
          </li>
        )}
      </ul>
    </main>
  );
}
