// src/app/student/profile/page.tsx
import { createClientServer } from '@/lib/supabase/server';
import TopRightActions from './TopRightActions';
import StudentProfileForm from './StudentProfileForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Student Profile',
};

export default async function ProfilePage() {
  const supabase = await createClientServer();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="relative p-6 md:p-8">
      {/* UPPER RIGHT HAND CORNER */}
      <TopRightActions />

      <h1 className="text-2xl md:text-3xl font-semibold mb-6">Student Profile</h1>

      {!user && (
        <p className="text-sm text-red-600">
          No active session.
        </p>
      )}

      {user && (
        <StudentProfileForm userId={user.id} />
      )}
    </main>
  );
}
