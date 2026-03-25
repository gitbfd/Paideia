import Link from 'next/link';
import { createClientServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DeleteAccountButton from './DeleteAccountButton';

export default async function ManageAccountPage() {
  const supabase = await createClientServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?redirect=/student/manage-account');
  }

  return (
    <main className="relative p-6 md:p-8 pt-20 md:pt-8 max-w-2xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-semibold text-gray-500 mb-8">Manage Account</h1>

      <div className="space-y-6">
        {/* Reset Password Section */}
        <section className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Password</h2>
          <p className="text-sm text-gray-600 mb-4">
            Update your password to keep your account secure.
          </p>
          <Link
            href="/auth/update-password"
            className="btn-outline btn-sm inline-block"
          >
            Reset Password
          </Link>
        </section>

        {/* Delete Account Section */}
        <section className="border border-red-200 rounded-lg p-6 bg-red-50">
          <h2 className="text-xl font-semibold text-red-900 mb-4">Danger Zone</h2>
          <p className="text-sm text-red-700 mb-4">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <DeleteAccountButton />
        </section>
      </div>
    </main>
  );
}
