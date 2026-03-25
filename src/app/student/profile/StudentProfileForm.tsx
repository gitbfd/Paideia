'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClientBrowser } from '@/lib/supabase';

type Profile = {
  id?: string;           // user id (same as auth user id)
  first_name?: string;
  last_name?: string;
  street?: string;
  city?: string;
  state?: string;
  email?: string;
  phone?: string;
  about_me?: string;
  avatar_url?: string;
};

type Course = {
  id: string | number;
  slug: string;
  title: string;
  description?: string | null;
  created_at?: string | null;
  // add more fields if your table has them (progress, status, etc.)
};

const DEFAULT_AVATARS = [
  '/img/prof_defaults/Alexander.png',
  '/img/prof_defaults/Augustus.png',
  '/img/prof_defaults/Lycurgus.png',
  '/img/prof_defaults/Perseus.png',
  '/img/prof_defaults/Virgil.png',
];

/**
 * Get a default avatar image for a user based on their ID.
 * This ensures each user consistently gets the same default avatar.
 */
function getDefaultAvatar(userId: string): string {
  // Use a simple hash of the userId to deterministically select an avatar
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  const index = Math.abs(hash) % DEFAULT_AVATARS.length;
  return DEFAULT_AVATARS[index];
}

export default function StudentProfileForm({ userId }: { userId: string }) {
  const supabase = createClientBrowser();
  const pathname = usePathname();

  // Profile state
  const [profile, setProfile] = useState<Profile>({
    id: userId,
    first_name: '',
    last_name: '',
    street: '',
    city: '',
    state: '',
    email: '',
    phone: '',
    about_me: '',
    avatar_url: '',
  });
  const [loading, setLoading] = useState(true);

  // Avatar state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>(getDefaultAvatar(userId));

  // Hidden input for click-on-photo
  const fileRef = useRef<HTMLInputElement>(null);
  const openFilePicker = () => fileRef.current?.click();
  const onKeyActivate: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openFilePicker();
    }
  };

  // Courses state (RHS)
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState<boolean>(true);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        // session sanity
        const { data: sess } = await supabase.auth.getSession();
        console.log('supabase session present?', !!sess?.session);

        // select profile (throw on real errors)
        let row: any = null;
        try {
          const { data, status } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle()
            .throwOnError();
          console.log('profiles.select status:', status);
          row = data ?? null;
        } catch (err: any) {
          console.error('profiles.select threw (raw):', err);
          console.error('profiles.select normalized:', {
            name: err?.name,
            message: err?.message,
            code: err?.code,
            details: err?.details,
            hint: err?.hint,
            status: err?.status,
            toString: String(err),
          });
        }

        // provision skeleton row if missing
        if (!row) {
          try {
            const { data: inserted } = await supabase
              .from('profiles')
              .upsert({ id: userId }, { onConflict: 'id' })
              .select()
              .maybeSingle()
              .throwOnError();
            row = inserted ?? null;
          } catch (err: any) {
            console.error('profiles.upsert threw (raw):', err);
            console.error('profiles.upsert normalized:', {
              name: err?.name,
              message: err?.message,
              code: err?.code,
              details: err?.details,
              hint: err?.hint,
              status: err?.status,
              toString: String(err),
            });
          }
        }

        if (active) {
          if (row) {
            setProfile((p) => ({ ...p, ...row }));
            // Use avatar_url if available, otherwise use default avatar
            setAvatarPreview(row.avatar_url || getDefaultAvatar(userId));
          } else {
            // No profile row yet, use default avatar
            setAvatarPreview(getDefaultAvatar(userId));
          }
          setLoading(false);
        }
      } catch (e) {
        console.error('profiles.load exception:', e);
        if (active) setLoading(false);
      }
    }

    async function loadCourses() {
      setLoadingCourses(true);
      try {
        // First, get enrollment course IDs
        const { data: enrollments, error: enrollmentsError } = await supabase
          .from('course_enrollments')
          .select('course_id')
          .eq('user_id', userId)
          .throwOnError();

        if (enrollmentsError) throw enrollmentsError;

        if (!enrollments || enrollments.length === 0) {
          if (active) setCourses([]);
          return;
        }

        // Then, get the actual courses
        const courseIds = enrollments.map(e => e.course_id);
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select('id, slug, title, description, created_at')
          .in('id', courseIds)
          .order('created_at', { ascending: false })
          .throwOnError();

        if (coursesError) throw coursesError;

        if (active) setCourses((coursesData as Course[]) ?? []);
      } catch (err: any) {
        // You will now see a real, useful message
        console.error('courses.select threw:', {
          name: err?.name,
          message: err?.message,
          code: err?.code,
          details: err?.details,
          hint: err?.hint,
          status: err?.status,
          toString: String(err),
        });
        if (active) setCourses([]);
      } finally {
        if (active) setLoadingCourses(false);
      }
    }
    // run both in parallel
    loadProfile();
    loadCourses();

    return () => { active = false; };
  }, [supabase, userId, pathname]); // Add pathname to dependencies to refresh when navigating to this page

  function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
    }
  }

  async function uploadAvatarIfNeeded(userId: string): Promise<string | undefined> {
    if (!avatarFile) return profile.avatar_url;

    const ext = (avatarFile.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${userId}/${Date.now()}.${ext}`;

    const { data: up, error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, avatarFile, { upsert: true, cacheControl: '3600' });

    if (upErr) {
      console.error('Avatar upload error:', {
        name: upErr.name, message: upErr.message, status: (upErr as any).status, code: (upErr as any).code
      });
      alert(`Upload failed: ${upErr.message}`);
      return profile.avatar_url;
    }

    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(up.path);
    const publicUrl = pub?.publicUrl;
    if (!publicUrl) {
      alert('Could not obtain avatar URL after upload');
      return profile.avatar_url;
    }

    setAvatarPreview(publicUrl);
    return publicUrl;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const avatar_url = await uploadAvatarIfNeeded(userId);
      const { error } = await supabase
        .from('profiles')
        .upsert({ ...profile, id: userId, avatar_url }, { onConflict: 'id' });
      if (error) {
        console.error('profiles.upsert error:', error);
        alert('Error saving profile: ' + (error.message ?? 'unknown error'));
        return;
      }
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <p className="mt-6 text-sm text-gray-500">Loading…</p>;

  return (
    <form onSubmit={onSubmit} className="flex flex-col md:flex-row justify-start items-start w-full min-h-screen">
      {/* LEFT HALF — profile section */}
      <div className="w-full md:w-1/2 flex flex-col items-center gap-8 px-6">
        {/* Clickable photo */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Change profile photo"
          onClick={openFilePicker}
          onKeyDown={onKeyActivate}
          className="w-[350px] h-[350px] rounded-full overflow-hidden relative bg-gray-100 aspect-square cursor-pointer group select-none"
        >
          <Image
            src={avatarPreview || getDefaultAvatar(userId)}
            alt="Profile picture"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 400px"
            priority
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/20">
            <span className="rounded-md px-3 py-1 text-white text-xs md:text-sm bg-black/50">
              {avatarPreview ? 'Click to change' : 'Click to upload'}
            </span>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={onAvatarChange}
          className="hidden"
        />

        {/* Profile fields (left half only) */}
        <div className="w-full max-w-md space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm text-gray-700">First Name</span>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={profile.first_name || ''}
                onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                required
              />
            </label>
            <label className="block">
              <span className="block text-sm text-gray-700">Last Name</span>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={profile.last_name || ''}
                onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                required
              />
            </label>
          </div>

          <label className="block">
            <span className="block text-sm text-gray-700">Street Address</span>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={profile.street || ''}
              onChange={(e) => setProfile({ ...profile, street: e.target.value })}
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="block">
              <span className="block text-sm text-gray-700">City</span>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={profile.city || ''}
                onChange={(e) => setProfile({ ...profile, city: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="block text-sm text-gray-700">State</span>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={profile.state || ''}
                onChange={(e) => setProfile({ ...profile, state: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="block text-sm text-gray-700">Phone</span>
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={profile.phone || ''}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
            </label>
          </div>

          <label className="block">
            <span className="block text-sm text-gray-700">Email</span>
            <input
              type="email"
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={profile.email || ''}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            />
          </label>

          <label className="block">
            <span className="block text-sm text-gray-700">About Me</span>
            <textarea
              rows={6}
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={profile.about_me || ''}
              onChange={(e) => setProfile({ ...profile, about_me: e.target.value })}
            />
          </label>

          <div className="pt-4 pb-8 md:pb-4 flex justify-center">
            <button
              type="submit"
              className="btn-secondary-md"
              disabled={loading}
            >
              {loading ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT HALF — My Courses panel */}
      <div className="flex flex-col w-full md:w-1/2 h-full px-6 md:px-8 py-6 md:border-l border-gray-200 md:border-t-0 border-t">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">My Courses</h2>
          <a
            href="/courses/select"
            className="btn-black-sm"
          >
            Add New Course
          </a>
        </div>

        <div className="flex flex-col h-full">
          <h3 className="text-md font-medium mb-2">Courses Underway</h3>

          <div className="flex-1 overflow-y-auto max-h-[400px] pr-2 space-y-2">
            {loadingCourses ? (
              <p className="text-gray-500 text-sm">Loading courses…</p>
            ) : courses.length > 0 ? (
              courses.map((course, idx) => (
                <Link
                  key={String(course.id ?? idx)}
                  href={`/courses/${course.slug}`}
                  className="group block border rounded-lg p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <p className="font-medium text-gray-100 group-hover:text-black">{course.title}</p>
                  <p className="text-sm text-gray-500">{course.description}</p>
                </Link>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No courses underway.</p>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
