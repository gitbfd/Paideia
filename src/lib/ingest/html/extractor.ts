// src/lib/ingest/html/extractor.ts
// HTML text extraction and processing

import { normalizeText } from '@/lib/shared';
import { stripHtmlTags } from './stripper';
import type { ExtractedContent } from '../types';

export async function extractHtmlContent(fileData: Blob): Promise<ExtractedContent> {
  // Read raw HTML
  const raw = await fileData.text();
  
  if (!raw || raw.trim().length === 0) {
    throw new Error('No content could be extracted from HTML file');
  }
  
  // HTML files: use raw HTML for display, strip tags for RAG
  const textForDisplay = raw; // Keep raw HTML for display
  const textForRag = normalizeText(stripHtmlTags(raw)); // Strip tags + normalize for RAG
  
  return {
    raw,
    textForDisplay,
    textForRag,
  };
}

