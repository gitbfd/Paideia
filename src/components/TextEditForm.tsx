// src/components/TextEditForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Text = {
  id: string;
  title: string;
  publication_date: string | null;
  author: string | null;
  translator: string | null;
  tags: string[] | null;
};

type Props = {
  text: Text;
};

export default function TextEditForm({ text }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(text.title);
  const [publicationDate, setPublicationDate] = useState(text.publication_date || '');
  const [author, setAuthor] = useState(text.author || '');
  const [translator, setTranslator] = useState(text.translator || '');
  const [tags, setTags] = useState(text.tags?.join(', ') || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSave() {
    setSaving(true);
    setMessage('');
    try {
      // Parse tags from comma-separated string
      const tagsArray = tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const res = await fetch(`/admin/texts/${text.id}`, {
        method: 'PATCH',
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
      if (!res.ok) {
        setMessage(`Error: ${json.error || 'Failed to save'}`);
        console.error('Save error:', json);
        return;
      }
      setMessage('Text saved successfully!');
      router.refresh(); // Revalidate data on the page
    } catch (err: any) {
      setMessage(`Error: ${err.message || 'An unexpected error occurred'}`);
      console.error('Save process error:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 max-w-xl">
      <h2 className="text-lg font-semibold">Text Details</h2>
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title *</label>
        <input
          id="title"
          className="mt-1 block w-full border p-2 rounded"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={saving}
        />
      </div>
      <div>
        <label htmlFor="publication_date" className="block text-sm font-medium text-gray-700">Publication Date</label>
        <input
          id="publication_date"
          type="text"
          className="mt-1 block w-full border p-2 rounded"
          placeholder="e.g., 350 BC or 2024 AD"
          value={publicationDate}
          onChange={(e) => setPublicationDate(e.target.value)}
          disabled={saving}
        />
        <p className="text-xs text-gray-500 mt-1">Format: YYYY BC or YYYY AD (e.g., 350 BC, 2024 AD)</p>
      </div>
      <div>
        <label htmlFor="author" className="block text-sm font-medium text-gray-700">Author</label>
        <input
          id="author"
          className="mt-1 block w-full border p-2 rounded"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          disabled={saving}
        />
      </div>
      <div>
        <label htmlFor="translator" className="block text-sm font-medium text-gray-700">Translator</label>
        <input
          id="translator"
          className="mt-1 block w-full border p-2 rounded"
          value={translator}
          onChange={(e) => setTranslator(e.target.value)}
          disabled={saving}
        />
      </div>
      <div>
        <label htmlFor="tags" className="block text-sm font-medium text-gray-700">Tags</label>
        <input
          id="tags"
          className="mt-1 block w-full border p-2 rounded"
          placeholder="Comma-separated tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          disabled={saving}
        />
        <p className="text-xs text-gray-500 mt-1">Separate multiple tags with commas</p>
      </div>
      <button
        type="button"
        className="btn-success-md"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
      {message && (
        <p className={`text-sm ${message.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
          {message}
        </p>
      )}
    </div>
  );
}

