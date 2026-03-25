// SidebarAvatar: receives avatar and name from server. Renders immediately on page load.
// SidebarAvatarLoader: async wrapper for streaming; use inside Suspense.

import Link from 'next/link';
import { getProfile } from '@/lib/courses/course-data';

function getInitials(profileName: string | null): string {
  if (!profileName || !profileName.trim()) return 'You';
  const parts = profileName.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.[0] ?? 'Y').toUpperCase();
  const first = parts[0]?.[0] ?? '';
  const last = parts[parts.length - 1]?.[0] ?? '';
  return `${first}${last}`.toUpperCase();
}

type Props = {
  avatarUrl: string | null;
  profileName: string | null;
};

export function SidebarAvatarSkeleton() {
  return (
    <div className="flex-shrink-0 border-b p-3">
      <div className="flex items-center justify-start rounded-md p-2">
        <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
      </div>
    </div>
  );
}

/** Async loader for streaming; wrap in Suspense. */
export async function SidebarAvatarLoader() {
  const profile = await getProfile();
  const profileName =
    (profile &&
      `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim()) ||
    null;
  return (
    <SidebarAvatar
      avatarUrl={profile?.avatar_url ?? null}
      profileName={profileName}
    />
  );
}

export default function SidebarAvatar({ avatarUrl, profileName }: Props) {
  const initials = getInitials(profileName);

  return (
    <div className="flex-shrink-0 border-b p-3">
      <Link
        href="/student/profile"
        className="flex items-center justify-start rounded-md p-2 transition-colors hover:bg-gray-50"
      >
        <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-sm font-semibold text-gray-600">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="Your avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>
      </Link>
    </div>
  );
}
