// src/components/AskCourse.tsx
'use client';

import { useState } from 'react';

export default function AskCourse({ courseId }: { courseId: string }) {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<{ id: string; content: string; similarity: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    setLoading(true);
    setError(null);
    setMatches([]);
    try {
      const res = await fetch(`/api/courses/${courseId}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, k: 6 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Ask failed');
      setMatches(json.matches || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border rounded p-4 space-y-3">
      <div className="font-medium">Ask this course</div>
      <div className="flex gap-2">
        <input
          className="border p-2 flex-1"
          placeholder="Type your question…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask()}
        />
        <button className="border px-3 py-2 rounded" onClick={ask} disabled={loading || !q.trim()}>
          {loading ? 'Searching…' : 'Ask'}
        </button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {!!matches.length && (
        <div className="space-y-2">
          <div className="text-sm text-gray-600">Top passages:</div>
          {matches.map((m) => (
            <div key={m.id} className="p-3 border rounded text-sm">
              <div className="text-gray-500">similarity: {m.similarity.toFixed(3)}</div>
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
