// src/app/signup/page.tsx (Server Component)
import SignupForm from './SignupForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create your student account',
};

export default function Page() {
  return (
    <div className="max-w-sm mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-4">Create your student account</h1>
      <SignupForm />
    </div>
  );
}
