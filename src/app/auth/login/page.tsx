// src/app/login/page.tsx (Server Component by default)
import { Suspense } from 'react';
import LoginForm from './LoginForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign in',
};

export default function Page() {
  return (
    <div className="max-w-sm mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-4">Sign in</h1>
      <Suspense fallback={<div>Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
