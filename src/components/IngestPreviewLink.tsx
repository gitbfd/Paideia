// src/components/IngestPreviewLink.tsx
'use client';

import Link from 'next/link';

type Props = {
  textId: string;
  documentId: string;
};

export default function IngestPreviewLink({ textId, documentId }: Props) {
  return (
    <Link
      href={`/admin/texts/${textId}/documents/${documentId}/ingest-preview`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-blue-600 hover:underline text-right block"
    >
      Preview Ingest
    </Link>
  );
}

