// src/lib/display/html/block-counter.ts
// Utility for counting block elements in HTML (legacy - text now wraps naturally with CSS)
// NOTE: Character-based wrapping has been removed. Text wraps naturally based on window width.

/**
 * Returns HTML as-is (no wrapping). Text wrapping is handled by CSS.
 * This function is kept for backward compatibility but does not modify the HTML.
 * @param html The HTML content
 * @param maxChars Ignored - kept for backward compatibility
 * @returns HTML unchanged
 */
export function wrapHtmlContent(html: string, maxChars?: number): string {
  // No-op: Text wrapping is now handled by CSS based on window width
  // This function is kept for backward compatibility
  return html;
}


/**
 * Counts block elements in HTML content (approximate block count)
 * Since text now wraps naturally with CSS, we count block elements as a proxy for "blocks"
 * @param html The HTML content to count blocks for
 * @param maxChars Ignored - kept for backward compatibility
 * @returns Approximate number of blocks (based on block elements)
 */
export function getWrappedHtmlBlockCount(html: string, maxChars?: number): number {
  if (!html || html.trim().length === 0) {
    return 1;
  }

  // Count block elements (p, h1-h6, div, blockquote, ul, ol, li, pre, img, hr)
  // This gives an approximate block count since text wraps naturally with CSS
  const blockElementRegex = /<(p|h[1-6]|div|blockquote|ul|ol|li|pre|img|hr)[^>]*>/gi;
  const matches = html.match(blockElementRegex);
  const blockCount = matches ? matches.length : 0;
  
  // Also count existing <br> tags (from original content, not inserted by wrapping)
  const brMatches = html.match(/<br\s*\/?>/gi);
  const brCount = brMatches ? brMatches.length : 0;
  
  // Return block count + br count + 1 (for any trailing content)
  // This is an approximation since actual block count depends on HTML structure
  return Math.max(1, blockCount + brCount);
}

