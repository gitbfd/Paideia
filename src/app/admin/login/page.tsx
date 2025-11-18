// src/app/admin/login/page.tsx
import AdminLoginForm from './AdminLoginForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin login',
};

export default function Page() {
  return (
    <div className="max-w-sm mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-4">Admin login</h1>
      <AdminLoginForm />
    </div>
  );
}
