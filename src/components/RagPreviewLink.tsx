// src/components/RagPreviewLink.tsx
'use client';

import Link from 'next/link';

type Props = {
  textId: string;
  documentId: string;
};

export default function RagPreviewLink({ textId, documentId }: Props) {
  return (
    <Link
      href={`/admin/texts/${textId}/documents/${documentId}/rag`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-blue-600 hover:underline text-right block"
    >
      Preview RAG
    </Link>
  );
}
