// src/app/student/profile/page.tsx
import { redirect } from 'next/navigation';
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

  if (!user) {
    redirect('/auth/login?redirect=/student/profile');
  }

  return (
    <main className="relative p-6 md:p-8 pt-20 md:pt-8">
      {/* UPPER RIGHT HAND CORNER */}
      <TopRightActions />

      <h1 className="hidden md:block text-2xl md:text-3xl font-semibold text-gray-500 mb-6">Student Profile</h1>

      <StudentProfileForm userId={user.id} />
    </main>
  );
}
