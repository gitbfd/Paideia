// src/components/CourseUploader.tsx

'use client';

import { useRef, useState } from 'react';
import { createClientBrowser } from '@/lib/supabase-client';

type Props = { courseId: string };

export default function CourseUploader({ courseId }: Props) {
  const supabase = createClientBrowser();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setStatus('Uploading to Storage…');
    setProgress(10);

    // 1) Upload to Storage (private bucket)
    const path = `${courseId}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from('course-docs').upload(path, file);
    if (upErr) {
      setStatus(`Upload failed: ${upErr.message}`);
      return;
    }

    setStatus('Registering document…');
    setProgress(40);

    // 2) Register in DB
    const resReg = await fetch(`/api/admin/courses/${courseId}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storage_path: path,
        source_type: 'pdf',
        bytes: file.size,
        mime: file.type || 'application/pdf',
        meta: { filename: file.name },
      }),
    });
    const reg = await resReg.json();
    if (!resReg.ok) {
      setStatus(`Register failed: ${reg.error || 'unknown error'}`);
      return;
    }

    setStatus('Ingesting (extract → clean → chunk → embed)…');
    setProgress(75);

    // 3) Trigger ingestion
    const resIng = await fetch(
      `/api/admin/courses/${courseId}/documents/${reg.document.id}/ingest`,
      { method: 'POST' }
    );
    const ing = await resIng.json();
    if (!resIng.ok) {
      setStatus(`Ingest failed: ${ing.error || 'unknown error'}`);
      return;
    }

    setProgress(100);
    setStatus(`Success: ${ing.chunks} chunks embedded.`);
  }

  return (
    <div className="border rounded p-4 space-y-3">
      <div className="font-medium">Upload PDF to this course</div>
      <input ref={fileRef} type="file" accept="application/pdf" />
      <button className="border px-3 py-1 rounded" onClick={handleUpload}>Upload & Ingest</button>
      {status && (
        <div className="text-sm">
          <div className="h-2 bg-gray-200 rounded overflow-hidden my-2">
            <div className="h-2 bg-green-500" style={{ width: `${progress}%` }} />
          </div>
          <div>{status}</div>
        </div>
      )}
    </div>
  );
}
