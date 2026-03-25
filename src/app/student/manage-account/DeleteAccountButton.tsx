'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientBrowser } from '@/lib/supabase';

export default function DeleteAccountButton() {
  const supabase = createClientBrowser();
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch('/api/student/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      // Sign out and redirect to home
      await supabase.auth.signOut();
      router.push('/');
    } catch (err: any) {
      console.error('Delete account error:', err);
      setError(err.message || 'An error occurred while deleting your account');
      setIsDeleting(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="space-y-4">
        <div className="text-sm font-medium text-red-900">
          Are you absolutely sure? This will permanently delete:
        </div>
        <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
          <li>Your profile and personal information</li>
          <li>All course enrollments</li>
          <li>All assessment results and progress</li>
          <li>Any courses you created (if you're an instructor)</li>
        </ul>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-red-900">
            Type <span className="font-mono font-bold">DELETE</span> to confirm:
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full border border-red-300 rounded px-3 py-2 bg-white"
            placeholder="DELETE"
            disabled={isDeleting}
          />
        </div>
        {error && (
          <div className="text-sm text-red-600 bg-red-100 p-2 rounded">{error}</div>
        )}
        <div className="flex gap-3">
          <button
            onClick={handleDelete}
            disabled={isDeleting || confirmText !== 'DELETE'}
            className="btn-danger-sm"
          >
            {isDeleting ? 'Deleting...' : 'Yes, Delete My Account'}
          </button>
          <button
            onClick={() => {
              setShowConfirm(false);
              setConfirmText('');
              setError(null);
            }}
            disabled={isDeleting}
            className="btn-outline btn-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="btn-danger-sm"
    >
      Delete Account
    </button>
  );
}
