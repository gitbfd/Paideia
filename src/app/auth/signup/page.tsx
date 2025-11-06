// src/app/signup/page.tsx (Server Component)
import SignupForm from './SignupForm';

export default function Page() {
  return (
    <div className="max-w-sm mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-4">Create your student account</h1>
      <SignupForm />
    </div>
  );
}
