// src/lib/ingest/html/stripper.ts
// Strips HTML tags from text while preserving semantic whitespace structure

const BLOCK_LEVEL_TAGS = [
  'p',
  'div',
  'section',
  'article',
  'blockquote',
  'ul',
  'ol',
  'li',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'td',
  'th',
  'pre',
  'code',
  'figure',
  'figcaption',
  'header',
  'footer',
  'aside',
  'nav',
  'hr',
  'img',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
];

/**
 * Converts HTML into plain text while attempting to preserve paragraph and line breaks.
 * This function intentionally keeps double newlines between block elements so that
 * character offsets in rag_text remain aligned with the rendered display content.
 */
export function stripHtmlTags(html: string): string {
  if (!html) {
    return '';
  }

  let text = html;

  // Normalize Windows line endings early
  text = text.replace(/\r\n?/g, '\n');

  // Replace <br> and horizontal rules with single newlines
  text = text.replace(/<(br|hr)\s*\/?>/gi, '\n');

  // Insert double newlines after block-level closing tags so paragraphs remain separated
  const blockClosingRegex = new RegExp(`</(?:${BLOCK_LEVEL_TAGS.join('|')})[^>]*>`, 'gi');
  text = text.replace(blockClosingRegex, '\n\n');

  // Remove HTML comments to avoid leaking markup into text output
  text = text.replace(/<!--[\s\S]*?-->/g, '');

  // Remove all remaining tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&apos;/gi, "'");

  // Collapse runs of tabs/spaces but preserve newlines
  text = text.replace(/[^\S\n]+/g, ' ');

  // Remove spaces preceding a newline to keep clean breaks
  text = text.replace(/ +\n/g, '\n');

  // Collapse excessive blank lines but keep double newlines (paragraph breaks)
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

