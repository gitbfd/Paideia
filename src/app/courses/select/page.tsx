// src/app/courses/select/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClientBrowser } from '@/lib/supabase-client';

type Course = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  published_at: string | null;
};

export default function SelectCoursePage() {
  const supabase = createClientBrowser();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to enroll in courses');
        return;
      }

      // Get all published courses
      const { data: allCourses, error: coursesError } = await supabase
        .from('courses')
        .select('id, slug, title, description, published_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (coursesError) throw coursesError;

      // Get enrolled courses for this user
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('course_enrollments')
        .select('course_id')
        .eq('user_id', user.id);

      if (enrollmentsError) throw enrollmentsError;

      const enrolledIds = new Set(enrollments?.map(e => e.course_id) || []);
      
      setCourses(allCourses || []);
      setEnrolledCourseIds(enrolledIds);
    } catch (err: any) {
      console.error('Error loading courses:', err);
      setError(err.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  }

  async function handleEnroll(courseId: string) {
    try {
      setEnrolling(courseId);
      setError(null);

      const response = await fetch('/courses/select/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_id: courseId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to enroll in course');
      }

      // Update enrolled courses
      setEnrolledCourseIds(prev => new Set([...prev, courseId]));
    } catch (err: any) {
      console.error('Error enrolling in course:', err);
      setError(err.message || 'Failed to enroll in course');
    } finally {
      setEnrolling(null);
    }
  }

  if (loading) {
    return (
      <main className="p-6">
        <p className="text-gray-500">Loading courses...</p>
      </main>
    );
  }

  return (
    <main className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Select a Course</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {courses.length === 0 ? (
        <p className="text-gray-500">No published courses available.</p>
      ) : (
        <ul className="space-y-2">
          {courses.map((course) => {
            const isEnrolled = enrolledCourseIds.has(course.id);
            return (
              <li key={course.id} className="border p-4 rounded flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium">{course.title}</div>
                  {course.description && (
                    <p className="text-sm text-gray-600 mt-1">{course.description}</p>
                  )}
                  {course.published_at && (
                    <p className="text-xs text-gray-500 mt-1">
                      Published: {new Date(course.published_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="ml-4">
                  {isEnrolled ? (
                    <span className="text-green-600 font-medium">Enrolled</span>
                  ) : (
                    <button
                      onClick={() => handleEnroll(course.id)}
                      disabled={enrolling === course.id}
                      className="px-4 py-2 rounded-xl bg-black text-white text-sm hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {enrolling === course.id ? 'Enrolling...' : 'Enroll'}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

