// src/app/login/page.tsx (Server Component by default)
import LoginForm from './LoginForm';

export default function Page() {
  return (
    <div className="max-w-sm mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-4">Sign in</h1>
      <LoginForm />
    </div>
  );
}
