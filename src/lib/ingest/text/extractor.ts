// src/lib/ingest/text/extractor.ts
// Plain text extraction and processing

import { normalizeText } from '@/lib/shared';
import type { ExtractedContent } from '../types';

export async function extractTextContent(fileData: Blob): Promise<ExtractedContent> {
  // Read raw text
  const raw = await fileData.text();
  
  if (!raw || raw.trim().length === 0) {
    throw new Error('No content could be extracted from text file');
  }
  
  // Other file types: normalize first
  const cleaned = normalizeText(raw);
  
  return {
    raw,
    textForDisplay: cleaned,
    textForRag: cleaned,
  };
}

