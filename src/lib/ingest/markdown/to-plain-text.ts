// src/lib/ingest/markdown/to-plain-text.ts
// Converts markdown to plain text for RAG purposes
// Strips markdown syntax while preserving the text content

import { marked } from 'marked';
import { stripHtmlTags } from '../html/stripper';
import { normalizeText } from '@/lib/shared';

/**
 * Converts markdown to plain text by:
 * 1. Converting markdown to HTML using marked
 * 2. Stripping HTML tags to get plain text
 * 3. Normalizing the text
 */
export async function markdownToPlainText(markdown: string): Promise<string> {
  if (!markdown || markdown.trim().length === 0) {
    return '';
  }

  try {
    // Convert markdown to HTML
    marked.setOptions({
      breaks: false, // Don't convert line breaks to <br> - we want natural text flow
      gfm: true, // GitHub Flavored Markdown
    });

    const html = await marked.parse(markdown);
    const htmlString = typeof html === 'string' ? html : String(html);

    // Strip HTML tags to get plain text
    const plainText = stripHtmlTags(htmlString);

    // Normalize the text (collapse spaces, fix line breaks, etc.)
    return normalizeText(plainText);
  } catch (error) {
    console.error('Markdown to plain text conversion error:', error);
    // Fallback: just normalize the raw markdown (will still have markdown syntax)
    return normalizeText(markdown);
  }
}

