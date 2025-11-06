// src/app/admin/courses/new/page.tsx

'use client';

import { useState } from 'react';

export default function NewCoursePage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  async function createCourse() {
    const res = await fetch('/api/admin/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description }),
    });
    const json = await res.json();
    if (!res.ok) return alert(json.error || 'Failed');
    window.location.href = `/admin/courses/${json.course.id}/edit`;
  }

  return (
    <main className="p-6 space-y-4 max-w-xl">
      <h1 className="text-xl font-semibold">Create Course</h1>
      <input className="border p-2 w-full" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className="border p-2 w-full" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
      <button className="border px-4 py-2 rounded" onClick={createCourse}>Create</button>
    </main>
  );
}
