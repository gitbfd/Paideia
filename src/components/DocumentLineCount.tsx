// src/components/DocumentLineCount.tsx
'use client';

import { useState, useEffect } from 'react';

type Props = {
  textId: string;
  documentId: string;
  ingestStatus: string;
};

export default function DocumentLineCount({ textId, documentId, ingestStatus }: Props) {
  const [lineCount, setLineCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ingestStatus === 'embedded' && !lineCount && !loading) {
      setLoading(true);
      fetch(`/admin/texts/${textId}/documents/${documentId}/preview/api`)
        .then(res => res.json())
        .then(json => {
          if (json.lineCount) {
            setLineCount(json.lineCount);
          }
        })
        .catch(() => {
          // Silently fail - line count is optional
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [textId, documentId, ingestStatus, lineCount, loading]);

  if (ingestStatus !== 'embedded' || !lineCount) {
    return null;
  }

  return <span> • {lineCount.toLocaleString()} lines</span>;
}

