// src/components/CourseEditForm.tsx
'use client';

import { useState } from 'react';

type Props = {
  course: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    status: string;
  };
};

export default function CourseEditForm({ course }: Props) {
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description || '');
  const [status, setStatus] = useState(course.status);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function updateCourse() {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/admin/courses/${course.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, status }),
      });

      const json = await res.json();
      
      if (!res.ok) {
        setMessage({ type: 'error', text: json.error || 'Failed to update course' });
        return;
      }

      setMessage({ type: 'success', text: 'Course updated successfully!' });
      // Optionally reload the page to show updated data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update course' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border rounded p-4 space-y-4 max-w-xl">
      <h2 className="text-lg font-semibold">Edit Course Details</h2>
      
      <div>
        <label className="block text-sm font-medium mb-1">Title</label>
        <input
          className="border p-2 w-full rounded"
          placeholder="Course Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          className="border p-2 w-full rounded"
          placeholder="Course Description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Status</label>
        <select
          className="border p-2 w-full rounded"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>

      {message && (
        <div className={`p-2 rounded ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <button
        className="border px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        onClick={updateCourse}
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}

