// src/components/TextUploader.tsx

'use client';

import { useRef, useState } from 'react';
import { createClientBrowser } from '@/lib/supabase-client';

type Props = { textId: string };

export default function TextUploader({ textId }: Props) {
  const supabase = createClientBrowser();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [uploading, setUploading] = useState(false);

  // Detect file type from filename
  function detectSourceType(filename: string, mimeType: string): 'pdf' | 'txt' | 'markdown' | 'html' | 'other' {
    const lowerName = filename.toLowerCase();
    
    if (lowerName.endsWith('.pdf') || mimeType === 'application/pdf') {
      return 'pdf';
    }
    if (lowerName.endsWith('.txt') || lowerName.endsWith('.text') || mimeType === 'text/plain') {
      return 'txt';
    }
    if (lowerName.endsWith('.md') || lowerName.endsWith('.markdown') || mimeType === 'text/markdown') {
      return 'markdown';
    }
    if (lowerName.endsWith('.html') || lowerName.endsWith('.htm') || mimeType === 'text/html') {
      return 'html';
    }
    return 'other';
  }

  function getDefaultMimeType(sourceType: string): string {
    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf',
      txt: 'text/plain',
      markdown: 'text/markdown',
      html: 'text/html',
      other: 'application/octet-stream',
    };
    return mimeMap[sourceType] || 'application/octet-stream';
  }

  async function handleUpload() {
    console.log('Upload button clicked');
    const file = fileRef.current?.files?.[0];
    if (!file) {
      // If no file selected, open the file picker
      fileRef.current?.click();
      return;
    }

    await performUpload(file);
  }

  async function performUpload(file: File) {
    setUploading(true);
    try {
      setStatus('Uploading to Storage…');
      setProgress(10);

      // 1) Upload to Storage (private bucket)
      const path = `texts/${textId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from('course-docs').upload(path, file);
      if (upErr) {
        setStatus(`Upload failed: ${upErr.message}`);
        setProgress(0);
        console.error('Upload error:', upErr);
        return;
      }

      setStatus('Registering document…');
      setProgress(40);

      // 2) Detect source type and register in DB
      const sourceType = detectSourceType(file.name, file.type);
      const resReg = await fetch(`/api/admin/texts/${textId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storage_path: path,
          source_type: sourceType,
          bytes: file.size,
          mime: file.type || getDefaultMimeType(sourceType),
          meta: { filename: file.name },
        }),
      });
      const reg = await resReg.json();
      if (!resReg.ok) {
        setStatus(`Register failed: ${reg.error || 'unknown error'}`);
        setProgress(0);
        console.error('Register error:', reg);
        return;
      }

      setStatus('Ingesting (extract → clean → chunk → embed)…');
      setProgress(75);

      // 3) Trigger ingestion
      const resIng = await fetch(
        `/api/admin/texts/${textId}/documents/${reg.document.id}/ingest`,
        { method: 'POST' }
      );
      
      // Check if response is JSON before parsing
      const contentType = resIng.headers.get('content-type');
      let ing: any;
      if (contentType && contentType.includes('application/json')) {
        ing = await resIng.json();
      } else {
        // If not JSON, get text response (likely an error page)
        const text = await resIng.text();
        setStatus(`Ingest failed: Server returned non-JSON response. Status: ${resIng.status}`);
        setProgress(0);
        console.error('Ingest error (non-JSON):', text.substring(0, 200));
        return;
      }
      
      if (!resIng.ok) {
        setStatus(`Ingest failed: ${ing.error || 'unknown error'}`);
        setProgress(0);
        console.error('Ingest error:', ing);
        return;
      }

      setProgress(100);
      setStatus(`Success: ${ing.chunks} chunks embedded.`);
      
      // Clear the file input so user can upload another file
      if (fileRef.current) {
        fileRef.current.value = '';
      }
    } catch (err: any) {
      setStatus(`Error: ${err.message || 'Unknown error occurred'}`);
      setProgress(0);
      console.error('Upload process error:', err);
    } finally {
      setUploading(false);
    }
  }

  // Handle file selection - auto-upload when file is selected
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      performUpload(file);
    }
  }

  return (
    <div className="border rounded p-4 space-y-3">
      <div className="font-medium">Upload document to this text</div>
      <input 
        ref={fileRef} 
        type="file" 
        accept=".pdf,.txt,.text,.md,.markdown,.html,.htm"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <div className="text-xs text-gray-500">
        Supported: PDF, TXT, Markdown (.md, .markdown), HTML
      </div>
      <button 
        type="button"
        className="border px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed" 
        onClick={handleUpload}
        disabled={uploading}
      >
        {uploading ? 'Uploading...' : 'Upload & Ingest'}
      </button>
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

