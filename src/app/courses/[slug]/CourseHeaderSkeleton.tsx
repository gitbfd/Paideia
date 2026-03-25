// src/app/courses/[slug]/CourseHeaderSkeleton.tsx

export default function CourseHeaderSkeleton() {
  return (
    <div className="bg-white border-b shadow-sm p-4">
      <div className="max-w-7xl mx-auto">
        <div className="h-6 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-full max-w-xl mt-2 bg-gray-100 rounded animate-pulse" />
        <div className="h-4 w-full max-w-md mt-1 bg-gray-100 rounded animate-pulse" />
      </div>
    </div>
  );
}
