import { redirect } from 'next/navigation';

/** Legacy URL: templates live under /admin/assessment-module-templates */
export default function LegacyAssessmentModulesIndex() {
  redirect('/admin/assessment-module-templates');
}
