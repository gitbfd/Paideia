// src/app/admin/assessment-modules/page.tsx
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Assessment Modules (Admin)',
};

export default async function AssessmentModules() {
  // Placeholder data for now
  const modules = [
    { id: '1', name: 'AM Object 1' },
    { id: '2', name: 'AM Object 2' },
    { id: '3', name: 'AM Object 3' },
  ];

  return (
    <main className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Assessment Modules (Admin)</h1>
        <Link className="text-blue-600 hover:underline" href="/admin/assessment-modules/new">New</Link>
      </div>

      <ul className="space-y-2">
        {modules.map((module) => (
          <li key={module.id} className="border p-4 rounded">
            <div className="font-medium">- {module.name}</div>
          </li>
        ))}
      </ul>
    </main>
  );
}

