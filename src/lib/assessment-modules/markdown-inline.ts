// src/lib/assessment-modules/markdown-inline.ts
// Converts inline markdown formatting to HTML
// Only handles inline formatting: bold (**text**), italic (*text*), and bold+italic (***text***)
// Does NOT change overall formatting or structure

/**
 * Converts inline markdown to HTML
 * - **text** or __text__ → <strong>text</strong>
 * - *text* or _text_ → <em>text</em>
 * - ***text*** or ___text___ → <strong><em>text</em></strong>
 * 
 * Preserves all other formatting and structure
 */
export function convertInlineMarkdownToHtml(text: string): string {
  if (!text) return text;
  
  let html = text;
  
  // Handle triple asterisks/underscores first (bold+italic) - must come before single/double
  // Pattern: ***text*** - match 3 asterisks, content, then 3 asterisks
  html = html.replace(/\*\*\*([^*]+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Pattern: ___text___ - match 3 underscores, content, then 3 underscores
  html = html.replace(/___([^_]+?)___/g, '<strong><em>$1</em></strong>');
  
  // Handle double asterisks/underscores (bold) - must come before single
  // Pattern: **text** - match 2 asterisks, content (not starting with *), then 2 asterisks
  html = html.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
  // Pattern: __text__ - match 2 underscores, content (not starting with _), then 2 underscores
  html = html.replace(/__([^_]+?)__/g, '<strong>$1</strong>');
  
  // Handle single asterisks/underscores (italic) - only if not part of bold
  // Pattern: *text* - match single asterisk, content (at least one non-asterisk char), then single asterisk
  // Use a more permissive pattern that avoids matching already processed text
  html = html.replace(/(?<!\*)\*([^*\s][^*]*?)\*(?!\*)/g, '<em>$1</em>');
  // Pattern: _text_ - match single underscore, content (at least one non-underscore char), then single underscore
  html = html.replace(/(?<!_)_([^_\s][^_]*?)_(?!_)/g, '<em>$1</em>');
  
  return html;
}
