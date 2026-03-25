'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  courseSlug: string;
  courseTitle: string;
};

export default function DeleteDraftCourseButton({ courseSlug, courseTitle }: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open() {
    setError(null);
    dialogRef.current?.showModal();
  }

  function close() {
    if (!deleting) dialogRef.current?.close();
  }

  async function confirmDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/admin/courses/${courseSlug}`, { method: 'DELETE' });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error || 'Failed to delete course');
        setDeleting(false);
        return;
      }
      dialogRef.current?.close();
      router.push('/admin/courses/draft');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
      setDeleting(false);
    }
  }

  return (
    <>
      <button type="button" className="btn-link-danger text-sm" onClick={open}>
        Delete
      </button>
      <dialog
        ref={dialogRef}
        className="mx-auto max-w-md rounded-lg border-0 bg-white p-0 shadow-xl [&::backdrop]:bg-black/50"
        aria-labelledby="delete-draft-course-title"
        onCancel={(e) => {
          if (deleting) e.preventDefault();
        }}
      >
        <div className="p-6">
          <h3 id="delete-draft-course-title" className="text-lg font-semibold mb-2">
            Delete course
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Are you sure you would like to delete this Course?
          </p>
          <p className="text-sm font-medium text-gray-900 mb-6">{courseTitle}</p>
          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-outline btn-md" onClick={close} disabled={deleting}>
              Cancel
            </button>
            <button type="button" className="btn-danger-sm" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Yes'}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
