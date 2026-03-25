import { redirect } from 'next/navigation';

/** Templates are created without a course; use the template editor. */
export default function LegacyNewAssessmentModule() {
  redirect('/admin/assessment-module-templates/new');
}
