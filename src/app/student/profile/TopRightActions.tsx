'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClientBrowser } from '@/lib/supabase';

export default function TopRightActions() {
  const supabase = createClientBrowser();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    // Send them back to login; adjust if your app uses a different route
    router.push('/');
  }

  return (
    <div className="absolute top-4 right-4 flex gap-3">
      <Link
        href="/student/manage-account"
        className="btn-outline btn-sm"
      >
        Manage Account
      </Link>

      <button
        onClick={handleLogout}
        className="btn-black-sm"
      >
        Log Out
      </button>
    </div>
  );
}
