// src/components/PdfViewer.tsx

'use client';
export default function PdfViewer({ url }: { url: string }) {
  return (
    <iframe src={url} className="w-full h-[80vh] border rounded" />
  );
}
