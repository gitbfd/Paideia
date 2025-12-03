'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  courseSlug: string;
  sectionId: string;
  initialTitle: string | null;
};

export default function EditSectionMetadataForm({
  courseSlug,
  sectionId,
  initialTitle,
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle ?? '');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');
    setError(null);

    try {
      const res = await fetch(`/admin/courses/${courseSlug}/text-sections/${sectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() === '' ? null : title.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update metadata');
      }

      setStatus('success');
      router.refresh();
    } catch (err: any) {
      setStatus('error');
      setError(err.message || 'Failed to update metadata');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-1">Section Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border rounded px-3 py-2 text-gray-900 placeholder:text-gray-600"
          placeholder="e.g., Chapter 1, Introduction"
        />
        <p className="text-xs text-gray-500 mt-1">
          Leave blank to use the default text title.
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={status === 'saving'}
        >
          {status === 'saving' ? 'Saving…' : 'Save Title'}
        </button>
        {status === 'success' && (
          <span className="text-sm text-green-600">Saved!</span>
        )}
      </div>
    </form>
  );
}

