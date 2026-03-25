'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export type AssessmentModuleTemplate = {
  id: string;
  title: string;
  description: string | null;
  question_type: 'definition' | 'socratic' | 'multiple_choice' | 'short_answer';
  config: Record<string, unknown>;
};

type Props = {
  template: AssessmentModuleTemplate;
};

export default function AssessmentModuleTemplateEditForm({ template }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(template.title);
  const [description, setDescription] = useState(template.description || '');
  const [questionType, setQuestionType] = useState(template.question_type);
  const [questionCount, setQuestionCount] = useState(
    Number(template.config?.question_count) || 5
  );
  const [questionPrompt, setQuestionPrompt] = useState(
    String(template.config?.question_prompt ?? '')
  );
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(
    (template.config?.difficulty as 'easy' | 'medium' | 'hard') || 'medium'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function save() {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(false);
    const config = {
      ...template.config,
      question_prompt: questionPrompt || undefined,
      question_count: questionCount,
      difficulty,
    };
    const res = await fetch('/admin/assessment-module-templates/api', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: template.id,
        title,
        description: description || null,
        question_type: questionType,
        config,
      }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error || 'Failed to update template');
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
          Template updated successfully.
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title *</label>
          <input
            className="border p-2 w-full"
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
            onChange={(e) =>
              setQuestionType(e.target.value as AssessmentModuleTemplate['question_type'])
            }
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
          <button type="button" className="btn-primary-md" onClick={save} disabled={loading}>
            {loading ? 'Saving…' : 'Save template'}
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
    </div>
  );
}
