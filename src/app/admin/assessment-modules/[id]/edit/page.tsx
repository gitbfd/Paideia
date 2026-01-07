// src/app/admin/assessment-modules/[id]/edit/page.tsx
import Link from 'next/link';
import { createClientServer } from '@/lib/supabase/server';
import AssessmentModuleEditForm from '@/components/AssessmentModuleEditForm';
import type { Metadata } from 'next';

type Course = {
  id: string;
  title: string;
  slug: string;
};

type AssessmentModule = {
  id: string;
  title: string;
  description: string | null;
  course_id: string;
  order_index: number;
  question_type: 'definition' | 'socratic' | 'multiple_choice' | 'short_answer';
  config: Record<string, any>;
  courses?: Course | null;
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const supabase = await createClientServer();
  const { id } = await params;
  
  const { data: module } = await supabase
    .from('assessment_modules')
    .select('title')
    .eq('id', id)
    .single();
  
  return {
    title: module ? `Edit Assessment Module: ${module.title}` : 'Edit Assessment Module',
  };
}

export default async function EditAssessmentModule({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClientServer();
  const { id } = await params;

  const { data: module, error } = await supabase
    .from('assessment_modules')
    .select(`
      id,
      title,
      description,
      course_id,
      order_index,
      question_type,
      config,
      courses (
        id,
        title,
        slug
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    return <div className="p-6 text-red-600">Error: {error.message}</div>;
  }
  if (!module) {
    return <div className="p-6">Assessment module not found.</div>;
  }

  // Transform the module data to match the expected type
  // Supabase returns courses as an array, but we expect a single Course object or null
  const transformedModule: AssessmentModule = {
    ...module,
    courses: Array.isArray(module.courses) 
      ? (module.courses.length > 0 ? module.courses[0] : null)
      : (module.courses || null),
  };

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Edit Assessment Module: {module.title}</h1>
        <Link className="text-blue-600 hover:underline" href="/admin/assessment-modules">
          ← Back to Assessment Modules
        </Link>
      </div>

      <AssessmentModuleEditForm module={transformedModule} />
    </main>
  );
}

