// src/app/courses/[slug]/ContentItemSkeleton.tsx

export default function ContentItemSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <div className="h-3 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-5 w-64 mt-2 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="p-6 space-y-3">
        <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
        <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
        <div className="h-4 w-4/5 bg-gray-100 rounded animate-pulse" />
      </div>
    </div>
  );
}
