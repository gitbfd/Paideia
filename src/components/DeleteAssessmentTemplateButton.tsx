'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  templateId: string;
  templateTitle: string;
};

export default function DeleteAssessmentTemplateButton({
  templateId,
  templateTitle,
}: Props) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch('/admin/assessment-module-templates/api', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: templateId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to delete template');
        setIsDeleting(false);
        return;
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
      setIsDeleting(false);
    }
  }

  if (showConfirm) {
    return (
      <div className="inline-block">
        <div className="text-xs text-red-700 mb-2 text-center">
          Delete template &quot;{templateTitle}&quot;?
        </div>
        <div className="flex gap-2 justify-center">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="btn-danger-sm"
          >
            {isDeleting ? 'Deleting...' : 'Yes'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowConfirm(false);
              setError(null);
            }}
            disabled={isDeleting}
            className="btn-outline btn-sm"
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
      type="button"
      onClick={() => setShowConfirm(true)}
      className="btn-link-danger text-sm"
    >
      Delete
    </button>
  );
}
