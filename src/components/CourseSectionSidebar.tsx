'use client';

import { useState } from 'react';

type SectionLink = {
  id: string;
  type?: 'text_section' | 'assessment_module';
  sectionTitle?: string | null;
  textTitle?: string | null;
  textAuthor?: string | null;
};

type Props = {
  sections: SectionLink[];
  courseTitle: string;
  courseDescription?: string | null;
  stats?: {
    sectionCount: number;
    blockCount: number;
  };
  profileSlot: React.ReactNode;
};

export default function CourseSectionSidebar({
  sections,
  courseTitle,
  courseDescription,
  stats,
  profileSlot,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);

  function handleNavigate(section: SectionLink) {
    const id = section.type === 'assessment_module' 
      ? `assessment-module-${section.id}`
      : `section-${section.id}`;
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <aside
      className={`sticky top-0 transition-all duration-300 flex flex-col ${
        collapsed ? 'w-10' : 'w-72'
      } bg-white border border-l-0 rounded-r-lg shadow-sm overflow-hidden max-h-screen`}
    >
      <div key="sidebar-profile" className="contents">
        {profileSlot}
      </div>

      {!collapsed && (
        <div className="flex-shrink-0 border-b p-3 space-y-2">
          <div>
            <div className="text-sm font-semibold text-gray-900">{courseTitle}</div>
            {courseDescription && (
              <p className="text-xs text-gray-500 mt-1">{courseDescription}</p>
            )}
          </div>
          {stats && stats.sectionCount >= 0 && (
            <div
              dangerouslySetInnerHTML={{
                __html: `<!-- ${stats.sectionCount.toLocaleString()} section${stats.sectionCount !== 1 ? 's' : ''} • ${stats.blockCount.toLocaleString()} block${stats.blockCount !== 1 ? 's' : ''} -->`,
              }}
            />
          )}
        </div>
      )}

      <div className="flex-shrink-0 flex items-center justify-between p-3 border-b">
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
      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-dark-thumb">
      {collapsed ? (
        <ul className="flex flex-col items-center py-3 space-y-2">
          {sections.map((section) => (
            <li
              key={section.id}
              className={`w-2 h-2 rounded-full cursor-pointer transition-colors ${
                section.type === 'assessment_module' 
                  ? 'bg-purple-400 hover:bg-purple-500' 
                  : 'bg-gray-400 hover:bg-blue-500'
              }`}
              onClick={() => handleNavigate(section)}
            />
          ))}
        </ul>
      ) : (
        <ul className="divide-y">
          {sections.map((section) => (
            <li
              key={section.id}
              className="p-3 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => handleNavigate(section)}
            >
              {section.type === 'assessment_module' ? (
                <>
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    {section.sectionTitle || 'Assessment Module'}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    Assessment Module
                  </div>
                </>
              ) : (
                <>
                  <div className="text-xs text-gray-500 truncate">
                    {section.textTitle ? (
                      <>
                        {section.textTitle}
                        {section.textAuthor && (
                          <span className="text-gray-400 font-normal">
                            {' by '}
                            {section.textAuthor}
                          </span>
                        )}
                      </>
                    ) : (
                      'Untitled Text'
                    )}
                  </div>
                  {section.sectionTitle && (
                    <div className="text-sm text-black truncate">
                      {section.sectionTitle}
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      </div>
    </aside>
  );
}


