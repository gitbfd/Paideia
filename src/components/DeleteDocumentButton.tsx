// src/components/DeleteDocumentButton.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  textId: string;
  documentId: string;
  filename?: string;
};

export default function DeleteDocumentButton({ textId, documentId, filename }: Props) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/admin/texts/${textId}/documents/${documentId}`, {
        method: 'DELETE',
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Failed to delete document');
        setIsDeleting(false);
        return;
      }

      // Success - refresh the page to show updated document list
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setIsDeleting(false);
    }
  }

  if (showConfirm) {
    return (
      <div className="mt-2 p-3 border border-red-300 rounded bg-red-50">
        <div className="text-sm font-medium text-red-800 mb-2">
          Are you sure you want to delete &quot;{filename || 'this document'}&quot;?
        </div>
        <div className="text-xs text-red-700 mb-3">
          This will permanently delete the document, all RAG vectors, and the file from storage. This action cannot be undone.
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="btn-danger-sm"
          >
            {isDeleting ? 'Deleting...' : 'Yes, Delete'}
          </button>
          <button
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
          <div className="mt-2 text-xs text-red-600">{error}</div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="btn-link-danger text-sm text-right block"
      type="button"
    >
      Delete
    </button>
  );
}

