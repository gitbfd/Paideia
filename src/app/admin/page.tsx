// admin/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin',
};

export default function AdminHome() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <p className="text-gray-600">Manage courses and content.</p>
    </main>
  );
}
