// src/app/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClientServer } from '@/lib/supabase';

type Profile = { role: 'admin' | 'student' };

export default async function Home() {
  const supabase = await createClientServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If signed in, look up role and redirect before rendering
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)   // <-- safe: user is non-null here
      .single<Profile>();

    redirect(profile?.role === 'admin' ? '/admin' : '/student/profile');
  }

  // Public landing for signed-out visitors
  return (
    <main className="px-6 py-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold">Welcome</h1>

      <div className="mt-8 grid gap-4 sm:flex">
        <Link href="/auth/signup" className="inline-block rounded border px-4 py-2 text-center">
          Create Account (new student)
        </Link>
        <Link href="/auth/login" className="inline-block rounded border px-4 py-2 text-center">
          Login to My Account
        </Link>
      </div>

      <div className="mt-10 text-sm text-gray-500">
        <Link href="/admin/login" className="underline">
          Login as admin user
        </Link>
      </div>
    </main>
  );
}
