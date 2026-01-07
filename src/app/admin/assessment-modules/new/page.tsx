'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClientBrowser } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';

type Course = {
  id: string;
  title: string;
  slug: string;
};

function NewAssessmentModuleForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientBrowser();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState('');
  const [orderIndex, setOrderIndex] = useState(0);
  const [questionType, setQuestionType] = useState<'definition' | 'socratic' | 'multiple_choice' | 'short_answer'>('short_answer');
  const [questionCount, setQuestionCount] = useState(5);
  const [questionPrompt, setQuestionPrompt] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCourses() {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, slug')
        .order('title', { ascending: true });
      
      if (error) {
        setError(`Failed to load courses: ${error.message}`);
        return;
      }
      
      setCourses(data || []);
      
      // If course_slug is provided, pre-select that course
      const courseSlug = searchParams.get('course_slug');
      if (courseSlug && data) {
        const course = data.find(c => c.slug === courseSlug);
        if (course) {
          setCourseId(course.id);
          // Calculate order_index based on existing items
          await calculateOrderIndex(courseSlug);
        }
      }
    }
    
    fetchCourses();
  }, [supabase, searchParams]);

  async function calculateOrderIndex(courseSlug: string) {
    try {
      // Fetch both text sections and assessment modules
      const [sectionsRes, modulesRes] = await Promise.all([
        fetch(`/admin/courses/${courseSlug}/text-sections`),
        fetch(`/admin/courses/${courseSlug}/assessment-modules/api`)
      ]);
      
      const sectionsData = await sectionsRes.json();
      const modulesData = await modulesRes.json();
      
      const allOrderIndices = [
        ...(sectionsData.sections || []).map((s: any) => s.order_index),
        ...(modulesData.modules || []).map((m: any) => m.order_index),
      ];
      
      const maxOrderIndex = allOrderIndices.length > 0 ? Math.max(...allOrderIndices) : -1;
      setOrderIndex(maxOrderIndex + 1);
    } catch (err) {
      // If calculation fails, default to 0
      setOrderIndex(0);
    }
  }

  async function createAssessmentModule() {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    
    if (!courseId) {
      setError('Please select a course');
      return;
    }

    setLoading(true);
    setError(null);

    const config = {
      question_prompt: questionPrompt || undefined,
      question_count: questionCount,
      difficulty: difficulty,
      allow_multiple_attempts: true,
    };

    const res = await fetch('/admin/assessment-modules/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description: description || null,
        course_id: courseId,
        order_index: orderIndex,
        question_type: questionType,
        config,
      }),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      // Show detailed error message
      const errorMsg = json.error || 'Failed to create assessment module';
      const details = json.details ? `\n\nDetails: ${JSON.stringify(json.details, null, 2)}` : '';
      setError(errorMsg + details);
      console.error('Assessment module creation error:', json);
      return;
    }

    // Redirect back to course edit page if we came from there
    const courseSlug = searchParams.get('course_slug');
    if (courseSlug) {
      router.push(`/admin/courses/${courseSlug}/edit`);
    } else {
      router.push(`/admin/assessment-modules/${json.module.id}/edit`);
    }
  }

  return (
    <main className="p-6 space-y-4 max-w-2xl">
      <h1 className="text-xl font-semibold">Create Assessment Module</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Course *</label>
          <select
            className="border p-2 w-full"
            value={courseId}
            onChange={async (e) => {
              setCourseId(e.target.value);
              // Recalculate order_index when course changes
              if (e.target.value) {
                const selectedCourse = courses.find(c => c.id === e.target.value);
                if (selectedCourse) {
                  await calculateOrderIndex(selectedCourse.slug);
                }
              }
            }}
            disabled={loading}
          >
            <option value="">Select a course</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Title *</label>
          <input
            className="border p-2 w-full"
            placeholder="Assessment Module Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            className="border p-2 w-full"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Order Index</label>
          <input
            type="number"
            className="border p-2 w-full"
            placeholder="0"
            value={orderIndex}
            onChange={(e) => setOrderIndex(Number(e.target.value) || 0)}
            disabled={loading}
          />
          <p className="text-sm text-gray-500 mt-1">
            Position in course sequence (0 = first, higher numbers appear later)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Question Type *</label>
          <select
            className="border p-2 w-full"
            value={questionType}
            onChange={(e) => setQuestionType(e.target.value as any)}
            disabled={loading}
          >
            <option value="short_answer">Short Answer</option>
            <option value="definition">Definition</option>
            <option value="socratic">Socratic</option>
            <option value="multiple_choice">Multiple Choice</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Question Count</label>
          <input
            type="number"
            className="border p-2 w-full"
            placeholder="5"
            value={questionCount}
            onChange={(e) => setQuestionCount(Number(e.target.value) || 5)}
            disabled={loading}
            min={1}
            max={20}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Difficulty *</label>
          <select
            className="border p-2 w-full"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
            disabled={loading}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <p className="text-sm text-gray-500 mt-1">
            Controls the complexity level of generated questions
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Question Generation Prompt</label>
          <textarea
            className="border p-2 w-full"
            placeholder="Custom prompt for question generation (optional)"
            value={questionPrompt}
            onChange={(e) => setQuestionPrompt(e.target.value)}
            disabled={loading}
            rows={4}
          />
          <p className="text-sm text-gray-500 mt-1">
            Optional: Custom instructions for how questions should be generated. If left empty, default prompts will be used based on question type.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            className="border px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            onClick={createAssessmentModule}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Assessment Module'}
          </button>
          <button
            className="border px-4 py-2 rounded hover:bg-gray-100 disabled:opacity-50"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </div>
    </main>
  );
}

export default function NewAssessmentModulePage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <NewAssessmentModuleForm />
    </Suspense>
  );
}

