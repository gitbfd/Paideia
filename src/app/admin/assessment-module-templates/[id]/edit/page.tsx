import Link from 'next/link';
import { createClientServer } from '@/lib/supabase/server';
import AssessmentModuleTemplateEditForm from '@/components/AssessmentModuleTemplateEditForm';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const supabase = await createClientServer();
  const { id } = await params;
  const { data } = await supabase
    .from('assessment_module_templates')
    .select('title')
    .eq('id', id)
    .maybeSingle();
  return {
    title: data ? `Edit template: ${data.title}` : 'Edit template',
  };
}

export default async function EditAssessmentModuleTemplate({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClientServer();
  const { id } = await params;

  const { data: template, error } = await supabase
    .from('assessment_module_templates')
    .select('id, title, description, question_type, config')
    .eq('id', id)
    .single();

  if (error) {
    return <div className="p-6 text-red-600">Error: {error.message}</div>;
  }
  if (!template) {
    return <div className="p-6">Template not found.</div>;
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Edit template: {template.title}</h1>
        <Link
          className="text-blue-600 hover:underline"
          href="/admin/assessment-module-templates"
        >
          ← Back to templates
        </Link>
      </div>
      <AssessmentModuleTemplateEditForm
        template={{
          ...template,
          config: (template.config as Record<string, unknown>) || {},
        }}
      />
    </main>
  );
}
