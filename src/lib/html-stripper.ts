// src/lib/html-stripper.ts
// Strips HTML tags from text while preserving text content

/**
 * Strips HTML tags from text, preserving the text content
 * This is used for RAG ingestion to remove HTML noise from embeddings
 */
export function stripHtmlTags(html: string): string {
  // Remove HTML tags but preserve text content
  // This regex matches <...> tags and removes them
  let text = html.replace(/<[^>]*>/g, '');
  
  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");
  
  // Normalize whitespace (multiple spaces/newlines to single space)
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

