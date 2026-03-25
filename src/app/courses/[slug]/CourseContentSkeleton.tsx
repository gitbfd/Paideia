// src/app/courses/[slug]/CourseContentSkeleton.tsx

import ContentItemSkeleton from './ContentItemSkeleton';

export default function CourseContentSkeleton() {
  return (
    <div className="flex-1">
      <div className="max-w-7xl mx-auto pr-6 pb-4 space-y-6">
        <ContentItemSkeleton />
        <ContentItemSkeleton />
        <ContentItemSkeleton />
      </div>
    </div>
  );
}
