// src/lib/ingest/markdown/extractor.ts
// Markdown text extraction and processing

import { markdownToPlainText } from './to-plain-text';
import type { ExtractedContent } from '../types';

export async function extractMarkdownContent(fileData: Blob): Promise<ExtractedContent> {
  // Read raw markdown
  const raw = await fileData.text();
  
  if (!raw || raw.trim().length === 0) {
    throw new Error('No content could be extracted from Markdown file');
  }
  
  // Markdown files: preserve markdown syntax for display, convert to plain text for RAG
  const textForDisplay = raw; // Keep raw markdown for proper conversion
  const textForRag = await markdownToPlainText(raw); // Convert markdown to plain text (strip syntax) for RAG
  
  return {
    raw,
    textForDisplay,
    textForRag,
  };
}

