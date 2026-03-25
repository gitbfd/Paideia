// src/app/courses/[slug]/CourseSidebarSkeleton.tsx

export default function CourseSidebarSkeleton() {
  return (
    <div className="flex-shrink-0 mr-6">
      <aside className="w-72 bg-white border border-l-0 rounded-r-lg shadow-sm overflow-hidden">
        <div className="border-b p-3">
          <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
        </div>
        <div className="border-b p-3 space-y-2">
          <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="border-b p-3">
          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="p-3 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-4/5 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
