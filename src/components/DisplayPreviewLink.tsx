// src/components/DisplayPreviewLink.tsx
'use client';

import Link from 'next/link';

type Props = {
  textId: string;
  documentId: string;
  filename?: string;
};

export default function DisplayPreviewLink({ textId, documentId }: Props) {
  return (
    <Link
      href={`/admin/texts/${textId}/documents/${documentId}/preview`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-blue-600 hover:underline text-right block"
    >
      Preview Display
    </Link>
  );
}

