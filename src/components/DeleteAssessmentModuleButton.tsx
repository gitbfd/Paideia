// src/components/DeleteAssessmentModuleButton.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  moduleId: string;
  moduleTitle: string;
};

export default function DeleteAssessmentModuleButton({ moduleId, moduleTitle }: Props) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/admin/assessment-modules/api`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: moduleId }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Failed to delete assessment module');
        setIsDeleting(false);
        return;
      }

      // Success - refresh the page to show updated list
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setIsDeleting(false);
    }
  }

  if (showConfirm) {
    return (
      <div className="inline-block">
        <div className="text-xs text-red-700 mb-2 text-center">
          Delete &quot;{moduleTitle}&quot;?
        </div>
        <div className="flex gap-2 justify-center">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Deleting...' : 'Yes'}
          </button>
          <button
            onClick={() => {
              setShowConfirm(false);
              setError(null);
            }}
            disabled={isDeleting}
            className="px-4 py-2 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
        {error && (
          <div className="mt-1 text-xs text-red-600 text-center">{error}</div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="text-red-600 hover:text-red-800 hover:underline text-sm"
      type="button"
    >
      Delete
    </button>
  );
}
