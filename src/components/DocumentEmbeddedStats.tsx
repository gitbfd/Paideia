'use client';

import { useState, useEffect } from 'react';

type Props = {
  textId: string;
  documentId: string;
  ingestStatus: string;
};

/** Metadata for embedded docs: character count + block count (matches display preview). */
export default function DocumentEmbeddedStats({
  textId,
  documentId,
  ingestStatus,
}: Props) {
  const [chars, setChars] = useState<number | null>(null);
  const [blocks, setBlocks] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (ingestStatus !== 'embedded') return;
    let cancelled = false;
    fetch(`/admin/texts/${textId}/documents/${documentId}/preview/api`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        const c =
          typeof json.ragTextCharCount === 'number' && json.ragTextCharCount >= 0
            ? json.ragTextCharCount
            : typeof json.characterCount === 'number' && json.characterCount >= 0
              ? json.characterCount
              : null;
        const b =
          typeof json.blockCount === 'number' && json.blockCount >= 0
            ? json.blockCount
            : null;
        setChars(c);
        setBlocks(b);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setDone(true);
      });
    return () => {
      cancelled = true;
    };
  }, [textId, documentId, ingestStatus]);

  if (ingestStatus !== 'embedded') {
    return null;
  }

  if (!done || (chars === null && blocks === null)) {
    return null;
  }

  const parts: string[] = [];
  if (chars !== null) {
    parts.push(`${chars.toLocaleString()} characters`);
  }
  if (blocks !== null) {
    parts.push(`${blocks.toLocaleString()} block${blocks === 1 ? '' : 's'}`);
  }
  if (parts.length === 0) return null;

  return <span> • {parts.join(' • ')}</span>;
}
