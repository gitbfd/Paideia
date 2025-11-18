// src/app/admin/dashboard/page.tsx (Server Component)
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin dashboard',
};

export default function AdminHome() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Admin dashboard</h1>
    </div>
  );
}
