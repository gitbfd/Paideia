// src/app/admin/texts/new/page.tsx
'use client';

import { useState } from 'react';

export default function NewTextPage() {
  const [title, setTitle] = useState('');
  const [publicationDate, setPublicationDate] = useState('');
  const [author, setAuthor] = useState('');
  const [translator, setTranslator] = useState('');
  const [tags, setTags] = useState(''); // Comma-separated tags

  async function createText() {
    // Parse tags from comma-separated string
    const tagsArray = tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    const res = await fetch('/admin/texts/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        publication_date: publicationDate || null,
        author: author || null,
        translator: translator || null,
        tags: tagsArray.length > 0 ? tagsArray : null,
      }),
    });
    const json = await res.json();
    if (!res.ok) return alert(json.error || 'Failed to create text');
    window.location.href = `/admin/texts/${json.text.id}/edit`;
  }

  return (
    <main className="p-6 space-y-4 max-w-xl">
      <h1 className="text-xl font-semibold">Create Text</h1>
      <div>
        <label className="block text-sm font-medium mb-1">Title *</label>
        <input
          className="border p-2 w-full rounded"
          placeholder="Text Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Publication Date</label>
        <input
          type="text"
          className="border p-2 w-full rounded"
          placeholder="e.g., 350 BC or 2024 AD"
          value={publicationDate}
          onChange={(e) => setPublicationDate(e.target.value)}
        />
        <p className="text-xs text-gray-500 mt-1">Format: YYYY BC or YYYY AD (e.g., 350 BC, 2024 AD)</p>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Author</label>
        <input
          className="border p-2 w-full rounded"
          placeholder="Author name"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Translator</label>
        <input
          className="border p-2 w-full rounded"
          placeholder="Translator name"
          value={translator}
          onChange={(e) => setTranslator(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Tags</label>
        <input
          className="border p-2 w-full rounded"
          placeholder="Comma-separated tags (e.g., philosophy, rhetoric, ancient)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
        <p className="text-xs text-gray-500 mt-1">Separate multiple tags with commas</p>
      </div>
      <button
        className="btn-primary-md"
        onClick={createText}
        disabled={!title.trim()}
      >
        Create
      </button>
    </main>
  );
}

