// src/app/courses/[slug]/CourseHeader.tsx
// Header with course title/description. Cached, loads first.

import { getCachedCourse } from '@/lib/courses/course-data';

type Props = { slug: string };

export default async function CourseHeader({ slug }: Props) {
  const course = await getCachedCourse(slug);
  if (!course) return <div className="p-6 text-red-600">Course not found.</div>;

  return (
    <div className="bg-white border-b shadow-sm p-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{course.title}</h1>
          <div className="text-sm text-gray-600">{course.description}</div>
        </div>
      </div>
    </div>
  );
}
