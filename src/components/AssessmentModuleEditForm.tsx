'use client';

import { useState, useEffect } from 'react';
import { createClientBrowser } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

type Course = {
  id: string;
  title: string;
  slug: string;
};

type AssessmentModule = {
  id: string;
  title: string;
  description: string | null;
  course_id: string;
  order_index: number;
  question_type: 'definition' | 'socratic' | 'multiple_choice' | 'short_answer';
  config: Record<string, any>;
  courses?: Course | null;
};

type Props = {
  module: AssessmentModule;
};

export default function AssessmentModuleEditForm({ module }: Props) {
  const router = useRouter();
  const supabase = createClientBrowser();
  
  const [title, setTitle] = useState(module.title);
  const [description, setDescription] = useState(module.description || '');
  const [courseId, setCourseId] = useState(module.course_id);
  const [questionType, setQuestionType] = useState(module.question_type);
  const [questionCount, setQuestionCount] = useState(module.config?.question_count || 5);
  const [questionPrompt, setQuestionPrompt] = useState(module.config?.question_prompt || '');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(module.config?.difficulty || 'medium');
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
    }
    
    fetchCourses();
  }, [supabase]);

  async function updateAssessmentModule() {
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
    setSuccess(false);

    const config = {
      ...module.config,
      question_prompt: questionPrompt || undefined,
      question_count: questionCount,
      difficulty: difficulty,
    };

    const res = await fetch(`/admin/assessment-modules/api`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: module.id,
        title,
        description: description || null,
        course_id: courseId,
        question_type: questionType,
        config,
      }),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error || 'Failed to update assessment module');
      return;
    }

    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          Assessment module updated successfully!
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Course *</label>
          <select
            className="border p-2 w-full"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
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
            onClick={updateAssessmentModule}
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Assessment Module'}
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
    </div>
  );
}

