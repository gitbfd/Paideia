// src/lib/extract-line-range.ts
// Utility to extract a specific line range from HTML content
import { wrapHtmlContent, getWrappedHtmlLineCount } from './wrap-html';

/**
 * Closes any unclosed HTML tags in the extracted content
 * This prevents browsers from creating extra visual lines when rendering malformed HTML
 * Uses a proper stack-based approach to track nested tags
 */
function closeUnclosedTags(html: string): string {
  const selfClosingTags = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr']);
  const openTags: string[] = [];
  let i = 0;

  while (i < html.length) {
    if (html[i] === '<') {
      const tagEnd = html.indexOf('>', i);
      if (tagEnd === -1) break;
      
      const tagContent = html.substring(i + 1, tagEnd).trim();
      const isClosing = tagContent.startsWith('/');
      const tagName = (isClosing ? tagContent.substring(1) : tagContent).split(/\s/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Skip comments, doctype, etc.
      if (tagContent.startsWith('!') || tagName.length === 0) {
        i = tagEnd + 1;
        continue;
      }
      
      if (isClosing) {
        // Remove matching opening tag from stack (find last matching tag)
        for (let j = openTags.length - 1; j >= 0; j--) {
          if (openTags[j] === tagName) {
            openTags.splice(j, 1);
            break;
          }
        }
      } else if (!selfClosingTags.has(tagName)) {
        // Add to open tags stack (ignore self-closing tags)
        // Check if tag is self-closing (ends with /)
        const isSelfClosing = tagContent.endsWith('/') || tagContent.match(/\/\s*$/);
        if (!isSelfClosing) {
          openTags.push(tagName);
        }
      }
      
      i = tagEnd + 1;
    } else {
      i++;
    }
  }

  // Close any remaining open tags in reverse order (LIFO - Last In First Out)
  if (openTags.length > 0) {
    const closingTags = openTags.reverse().map(tag => `</${tag}>`).join('');
    return html + closingTags;
  }

  return html;
}

/**
 * Extracts a specific line range from HTML content
 * Uses the same line counting logic as getWrappedHtmlLineCount to ensure accuracy
 * @param html The HTML content to extract from
 * @param startLine Starting line number (1-indexed, inclusive)
 * @param endLine Ending line number (1-indexed, inclusive)
 * @returns HTML content containing only the specified line range
 */
export function extractLineRange(html: string, startLine: number, endLine: number): string {
  if (!html || html.trim().length === 0) {
    return '';
  }

  // First, wrap the HTML to ensure line numbers match
  const wrapped = wrapHtmlContent(html);
  
  // Split by <br> tags to get individual lines
  // The regex captures <br> tags so they're included in the split array
  const segments = wrapped.split(/(<br\s*\/?>)/gi);
  
  // Reconstruct lines: each segment is either text or a <br> tag
  // Lines are separated by <br> tags
  const lines: string[] = [];
  let currentLine = '';
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    
    if (segment.match(/<br\s*\/?>/gi)) {
      // This is a <br> tag - end current line and start new one
      // Always add the line when we hit a <br> tag (even if empty)
      // This ensures line numbers match exactly
      lines.push(currentLine);
      currentLine = '';
    } else if (segment) {
      // This is text content (may include HTML tags) - add to current line
      currentLine += segment;
    }
  }
  
  // Add the last line (there's no <br> after the last line)
  if (currentLine || lines.length > 0) {
    lines.push(currentLine);
  }
  
  // Verify total line count matches what getWrappedHtmlLineCount would return
  // This ensures our extraction logic is correct
  const expectedTotalLines = getWrappedHtmlLineCount(wrapped);
  if (lines.length !== expectedTotalLines) {
    console.warn(`Line count mismatch: extracted ${lines.length} lines, expected ${expectedTotalLines}`);
  }
  
  // Extract the requested line range (1-indexed, so subtract 1 for array index)
  const startIdx = Math.max(0, startLine - 1);
  // endLine is inclusive, so we need to include it: slice(start, end) is exclusive of end
  // So for lines 1-284, we want indices 0-283, which is slice(0, 284)
  // IMPORTANT: endIdx should be endLine (not endLine + 1) because slice is exclusive
  // For lines 1-284: startIdx=0, endIdx=284, slice(0, 284) gives indices 0-283 (284 lines)
  const endIdx = Math.min(lines.length, endLine);
  
  if (startIdx >= lines.length || startIdx >= endIdx || startLine > endLine) {
    return '';
  }
  
  // Extract exactly the requested number of lines
  // slice(start, end) is exclusive of end, so slice(0, 284) gives us indices 0-283 (284 lines)
  // CRITICAL: We must extract exactly (endLine - startLine + 1) lines, no more
  const expectedLineCount = endLine - startLine + 1;
  const extractedLines = lines.slice(startIdx, endIdx);
  
  // Double-check: if we got more lines than expected, something is wrong
  if (extractedLines.length > expectedLineCount) {
    console.error(`[extractLineRange] CRITICAL BUG: slice returned ${extractedLines.length} lines but expected ${expectedLineCount}. This should never happen!`);
  }
  
  // Verify we got the right number of lines
  if (extractedLines.length !== expectedLineCount) {
    console.warn(`[extractLineRange] Expected ${expectedLineCount} lines (${startLine}-${endLine}), got ${extractedLines.length}. Total available: ${lines.length}`);
  }
  
  // Safety check: ensure we never extract more than requested
  // If we somehow got more lines, truncate to the exact count
  if (extractedLines.length > expectedLineCount) {
    // Only log in development to avoid noise in production
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[extractLineRange] Extracted ${extractedLines.length} lines but only ${expectedLineCount} requested. Truncating.`);
    }
    // Truncate to exact count
    extractedLines.length = expectedLineCount;
  }
  
  // Join the extracted lines with <br> tags
  // This creates exactly (extractedLines.length - 1) <br> tags
  // So the final line count will be: (extractedLines.length - 1) + 1 = extractedLines.length
  let result = extractedLines.join('<br>');
  
  // CRITICAL: Ensure we haven't accidentally included content beyond the requested range
  // Count the actual lines in the result to verify
  const actualBrCount = (result.match(/<br\s*\/?>/gi) || []).length;
  if (actualBrCount !== expectedLineCount - 1) {
    console.error(`[extractLineRange] CRITICAL: Result has ${actualBrCount} <br> tags but expected ${expectedLineCount - 1}. This means we're including extra content!`);
  }
  
  // Close any unclosed HTML tags to prevent extra visual lines when rendered
  // This ensures the extracted content is well-formed HTML
  result = closeUnclosedTags(result);
  
  // Verify we got the right number of lines
  // Note: result is already wrapped (has <br> tags), so we count <br> tags directly
  // instead of calling getWrappedHtmlLineCount which would wrap it again
  const brMatches = result.match(/<br\s*\/?>/gi);
  const extractedLineCount = brMatches ? brMatches.length + 1 : 1;
  const expectedExtractedLines = endLine - startLine + 1;
  if (extractedLineCount !== expectedExtractedLines) {
    console.warn(`[extractLineRange] Extracted line count mismatch: got ${extractedLineCount}, expected ${expectedExtractedLines}`);
  }
  
  // Debug logging in development - check tag balance AFTER closing
  if (process.env.NODE_ENV === 'development' && startLine === 1 && endLine === 284) {
    const last100Chars = result.slice(-100);
    const lastLineContent = extractedLines[extractedLines.length - 1];
    // Check tag balance AFTER closing
    // Exclude <br> tags from opening tag count (they're self-closing)
    const allOpeningTags = result.match(/<[^/!][^>]*>/g) || [];
    const brTags = allOpeningTags.filter(tag => /^<br\s*\/?>/i.test(tag));
    const openingTags = allOpeningTags.length - brTags.length; // Exclude <br> tags
    const closingTags = (result.match(/<\/[^>]+>/g) || []).length;
    const selfClosing = (result.match(/<[^>]+\/>/g) || []).length;
    const unclosedCount = openingTags - closingTags; // Don't subtract selfClosing since we already excluded <br>
    console.log(`[extractLineRange] Extracted lines ${startLine}-${endLine}:`, {
      extractedLinesCount: extractedLines.length,
      brTagCount: brMatches ? brMatches.length : 0,
      resultLength: result.length,
      last100Chars: last100Chars,
      lastLineContent: lastLineContent?.substring(0, 100),
      openingTags,
      closingTags,
      selfClosing,
      brTagsExcluded: brTags.length,
      unclosedCount,
      tagsClosed: unclosedCount > 0 ? `${unclosedCount} still unclosed!` : 'All closed ✓'
    });
  }
  
  return result;
}

