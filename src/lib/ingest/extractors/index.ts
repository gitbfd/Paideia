// src/lib/ingest/extractors/index.ts
// Main extractor dispatcher

import type { SourceType, ExtractedContent } from '../types';
import { extractPdfText } from '../pdf/extractor';
import { extractHtmlContent } from '../html/extractor';
import { extractMarkdownContent } from '../markdown/extractor';
import { extractTextContent } from '../text/extractor';
import { normalizeText } from '@/lib/shared';

/**
 * Extracts text content from a file based on its source type
 */
export async function extractContent(
  fileData: Blob,
  sourceType: SourceType
): Promise<ExtractedContent> {
  if (sourceType === 'pdf') {
    const raw = await extractPdfText(fileData);
    // PDFs: normalize for both display and RAG
    const cleaned = normalizeText(raw);
    return {
      raw,
      textForDisplay: cleaned,
      textForRag: cleaned,
    };
  } else if (sourceType === 'html') {
    return await extractHtmlContent(fileData);
  } else if (sourceType === 'markdown') {
    return await extractMarkdownContent(fileData);
  } else {
    // txt, other, or fallback
    return await extractTextContent(fileData);
  }
}
