'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

type SectionLink = {
  id: string;
  title: string;
  textTitle?: string | null;
  startLine: number;
  endLine: number;
};

type Props = {
  sections: SectionLink[];
  courseTitle: string;
  courseDescription?: string | null;
  stats?: {
    sectionCount: number;
    lineCount: number;
    charCount: number;
  };
  avatarUrl?: string | null;
  profileName?: string | null;
};

export default function CourseSectionSidebar({
  sections,
  courseTitle,
  courseDescription,
  stats,
  avatarUrl,
  profileName,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const initials = useMemo(() => {
    if (!profileName) return 'You';
    const parts = profileName.trim().split(/\s+/);
    if (parts.length === 0) return 'You';
    if (parts.length === 1) return parts[0]?.[0]?.toUpperCase() ?? 'Y';
    return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
  }, [profileName]);

  function handleNavigate(sectionId: string) {
    const el = document.getElementById(`section-${sectionId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <aside
      className={`sticky top-0 transition-all duration-300 ${
        collapsed ? 'w-10' : 'w-72'
      } bg-white border border-l-0 rounded-r-lg shadow-sm overflow-hidden`}
    >
      <div className="border-b p-3">
        <Link
          href="/student/profile"
          className="flex items-center justify-start rounded-md p-2 transition-colors hover:bg-gray-50"
        >
          <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-sm font-semibold text-gray-600">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Your avatar" className="w-full h-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
        </Link>
      </div>

      {!collapsed && (
        <div className="border-b p-3 space-y-2">
          <div>
            <div className="text-sm font-semibold text-gray-900">{courseTitle}</div>
            {courseDescription && (
              <p className="text-xs text-gray-500 mt-1">{courseDescription}</p>
            )}
          </div>
          {stats && stats.sectionCount >= 0 && (
            <div
              dangerouslySetInnerHTML={{
                __html: `<!-- ${stats.sectionCount.toLocaleString()} section${stats.sectionCount !== 1 ? 's' : ''} • ${stats.lineCount.toLocaleString()} lines • ${stats.charCount.toLocaleString()} characters -->`,
              }}
            />
          )}
        </div>
      )}

      <div className="flex items-center justify-between p-3 border-b">
        {!collapsed && <h2 className="text-sm font-semibold text-gray-700">Sections</h2>}
        <button
          type="button"
          aria-label={collapsed ? 'Expand sections' : 'Collapse sections'}
          onClick={() => setCollapsed((prev) => !prev)}
          className="text-gray-500 hover:text-gray-900 text-xs font-medium"
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>
      {collapsed ? (
        <ul className="flex flex-col items-center py-3 space-y-2">
          {sections.map((section) => (
            <li
              key={section.id}
              className="w-2 h-2 rounded-full bg-gray-400 cursor-pointer hover:bg-blue-500 transition-colors"
              onClick={() => handleNavigate(section.id)}
            />
          ))}
        </ul>
      ) : (
        <ul className="divide-y">
          {sections.map((section) => (
            <li
              key={section.id}
              className="p-3 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => handleNavigate(section.id)}
            >
              <div className="text-sm font-medium text-gray-800 truncate">
                {section.title || section.textTitle || 'Untitled Section'}
              </div>
              <div className="text-xs text-gray-500">
                Lines {section.startLine}–{section.endLine}
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}


