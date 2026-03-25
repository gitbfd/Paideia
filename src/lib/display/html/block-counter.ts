// src/lib/display/html/block-counter.ts
// NOTE: Display block counts use htmlToBlockGridRowsWithChars; text wraps with CSS in the preview.

/**
 * Returns HTML as-is (no wrapping). Text wrapping is handled by CSS.
 * Kept for backward compatibility; does not modify the HTML.
 */
export function wrapHtmlContent(html: string, _maxChars?: number): string {
  return html;
}

