'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';

function NewTemplateForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questionType, setQuestionType] = useState<
    'definition' | 'socratic' | 'multiple_choice' | 'short_answer'
  >('short_answer');
  const [questionCount, setQuestionCount] = useState(5);
  const [questionPrompt, setQuestionPrompt] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createTemplate() {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setLoading(true);
    setError(null);
    const config = {
      question_prompt: questionPrompt || undefined,
      question_count: questionCount,
      difficulty,
      allow_multiple_attempts: true,
    };
    const res = await fetch('/admin/assessment-module-templates/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description: description || null,
        question_type: questionType,
        config,
      }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error || 'Failed to create template');
      return;
    }
    router.push(`/admin/assessment-module-templates/${json.template.id}/edit`);
  }

  return (
    <main className="p-6 space-y-4 max-w-2xl">
      <h1 className="text-xl font-semibold">New assessment module template</h1>
      <p className="text-sm text-gray-600">
        Templates are not attached to any course. Instantiate them when adding an assessment module
        to a course.
      </p>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title *</label>
          <input
            className="border p-2 w-full"
            placeholder="Template title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            className="border p-2 w-full"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
            rows={3}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Question type *</label>
          <select
            className="border p-2 w-full"
            value={questionType}
            onChange={(e) => setQuestionType(e.target.value as typeof questionType)}
            disabled={loading}
          >
            <option value="short_answer">Short answer</option>
            <option value="definition">Definition</option>
            <option value="socratic">Socratic</option>
            <option value="multiple_choice">Multiple choice</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Question count</label>
          <input
            type="number"
            className="border p-2 w-full"
            min={1}
            max={20}
            value={questionCount}
            onChange={(e) => setQuestionCount(Number(e.target.value) || 5)}
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Difficulty *</label>
          <select
            className="border p-2 w-full"
            value={difficulty}
            onChange={(e) =>
              setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')
            }
            disabled={loading}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Question generation prompt
          </label>
          <textarea
            className="border p-2 w-full"
            value={questionPrompt}
            onChange={(e) => setQuestionPrompt(e.target.value)}
            disabled={loading}
            rows={4}
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-primary-md"
            onClick={createTemplate}
            disabled={loading}
          >
            {loading ? 'Creating…' : 'Create template'}
          </button>
          <button
            type="button"
            className="btn-outline btn-md"
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

export default function NewAssessmentModuleTemplatePage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <NewTemplateForm />
    </Suspense>
  );
}
