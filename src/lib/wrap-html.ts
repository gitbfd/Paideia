// src/lib/wrap-html.ts
// Utility to wrap HTML content at a given character count per line by inserting <br> tags
import { lineWrapConfig } from './line-wrap-config';

/**
 * Wraps HTML content by inserting <br> tags at word boundaries after maxChars
 * Preserves all existing HTML structure (headings, blockquotes, links, etc.)
 * @param html The HTML content to wrap
 * @param maxChars Maximum characters per line (defaults to lineWrapConfig.maxCharsPerLine)
 * @returns HTML with <br> tags inserted for wrapping
 */
export function wrapHtmlContent(html: string, maxChars: number = lineWrapConfig.maxCharsPerLine): string {
  if (!html || html.trim().length === 0) {
    return html;
  }

  // Process HTML character by character, preserving tags
  let result = '';
  let currentText = '';
  let charCount = 0;
  let inTag = false;
  let listDepth = 0; // Track depth of nested lists (<ul>, <ol>)
  let preDepth = 0; // Track depth of nested <pre> tags (don't wrap inside <pre>)

  for (let i = 0; i < html.length; i++) {
    const char = html[i];

    if (char === '<') {
      // Process accumulated text before entering tag
      if (currentText.length > 0) {
        // Only wrap text if we're not inside a list or <pre> tag
        if (listDepth === 0 && preDepth === 0) {
          result += wrapTextWithBreaks(currentText, maxChars, charCount);
        } else {
          // Inside a list or <pre> - don't wrap, just add the text as-is
          result += currentText;
        }
        currentText = '';
        charCount = 0;
      }
      inTag = true;
      result += char;
    } else if (char === '>') {
      // Exiting tag
      inTag = false;
      result += char;
      
      // Check what tag we just closed
      const beforeTag = html.substring(Math.max(0, i - 20), i);
      
      // Track list depth - increment when opening <ul> or <ol>, decrement when closing
      if (beforeTag.match(/<ul[^>]*>/i) || beforeTag.match(/<ol[^>]*>/i)) {
        listDepth++;
      } else if (beforeTag.match(/<\/ul>/i) || beforeTag.match(/<\/ol>/i)) {
        listDepth--;
      }
      
      // Track <pre> depth - increment when opening <pre>, decrement when closing
      if (beforeTag.match(/<pre[^>]*>/i)) {
        preDepth++;
      } else if (beforeTag.match(/<\/pre>/i)) {
        preDepth--;
      }
      
      // Reset char count for block-level elements (but not inside lists or <pre>)
      if (listDepth === 0 && preDepth === 0 && beforeTag.match(/<\/?(p|div|h[1-6]|br|blockquote)/i)) {
        charCount = 0;
      }
    } else if (inTag) {
      // Inside a tag, just copy it
      result += char;
    } else {
      // In text content, accumulate it
      currentText += char;
    }
  }

  // Process any remaining text
  if (currentText.length > 0) {
    if (listDepth === 0 && preDepth === 0) {
      result += wrapTextWithBreaks(currentText, maxChars, charCount);
    } else {
      result += currentText;
    }
  }

  return result;
}

/**
 * Wraps text by inserting <br> tags at word boundaries after maxChars
 * @param text The text to wrap (may contain HTML entities)
 * @param maxChars Maximum characters per line
 * @param currentCharCount Current character count in the line
 * @returns Text with <br> tags inserted
 */
function wrapTextWithBreaks(text: string, maxChars: number, currentCharCount: number = 0): string {
  // Decode HTML entities to count actual characters
  const decoded = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");

  const words = decoded.split(/(\s+)/); // Split but keep whitespace
  let result = '';
  let lineLength = currentCharCount;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const wordLength = word.length;

    // If adding this word would exceed the limit, insert <br> and start new line
    if (lineLength > 0 && lineLength + wordLength > maxChars) {
      result += '<br>';
      lineLength = 0;
    }

    // Add the word (preserve original HTML entities in the text)
    result += word;
    lineLength += wordLength;
  }

  return result;
}

/**
 * Counts lines in HTML content by wrapping it the same way as wrapHtmlContent
 * This ensures the count matches the actual displayed lines
 * @param html The HTML content to count lines for
 * @param maxChars Maximum characters per line (defaults to lineWrapConfig.maxCharsPerLine)
 * @returns Number of lines
 */
export function getWrappedHtmlLineCount(html: string, maxChars: number = lineWrapConfig.maxCharsPerLine): number {
  if (!html || html.trim().length === 0) {
    return 1;
  }

  // Step 1: Wrap the HTML content (insert <br> tags at word boundaries)
  const wrapped = wrapHtmlContent(html, maxChars);
  
  // Step 2: Count only actual text lines (created by <br> tags)
  // Block elements like H1, P, etc. contain text that gets wrapped with <br> tags
  // We don't count the block elements themselves as separate lines - only the <br> tags
  // that create actual line breaks in the text content
  const brMatches = wrapped.match(/<br\s*\/?>/gi);
  const brCount = brMatches ? brMatches.length : 0;
  
  // Total lines = number of <br> tags + 1 (for the final line)
  // This counts actual text lines, not vertical space from margins
  return brCount + 1;
}

