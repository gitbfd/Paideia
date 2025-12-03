// src/lib/display/html/to-block-grid-rows-with-chars.ts
// Simplified: Converts HTML to block-based grid rows with character range metadata
// Each outermost block element = one grid row with numbering and char ranges

import type { GridRow } from './to-grid-rows';
import { stripHtmlTags } from '@/lib/ingest/html/stripper';
import { normalizeText } from '@/lib/shared';

const BLOCK_ELEMENT_REGEX = /<\/(p|div|blockquote|ul|ol|table|pre|section|article|header|footer|figure|h[1-6])\s*>|<(p|div|blockquote|ul|ol|table|pre|section|article|header|footer|figure|h[1-6])[^>]*>|<(img|hr)[^>]*\/?>/gi;

const BLOCK_TAGS = new Set([
  'p', 'div', 'blockquote', 'ul', 'ol', 'section', 'article',
  'header', 'footer', 'figure', 'figcaption', 'table', 'thead',
  'tbody', 'tr', 'td', 'th', 'pre', 'code', 'h1', 'h2', 'h3',
  'h4', 'h5', 'h6', 'img', 'hr',
]);

export interface BlockGridRowWithChars extends GridRow {
  startChar?: number;
  endChar?: number;
}

export function filterBlockRowsByCharRange(
  rows: BlockGridRowWithChars[],
  startChar: number,
  endChar: number
): BlockGridRowWithChars[] {
  if (!rows || rows.length === 0) {
    return [];
  }

  let firstIndex = -1;
  let lastIndex = -1;

  rows.forEach((row, index) => {
    if (row.startChar === undefined || row.endChar === undefined) {
      return;
    }

    const overlaps = row.endChar > startChar && row.startChar < endChar;
    if (overlaps) {
      if (firstIndex === -1) {
        firstIndex = index;
      }
      lastIndex = index;
    }
  });

  if (firstIndex === -1) {
    return [];
  }

  // Include any neighboring rows without char metadata that sit between/around the matched range
  while (firstIndex > 0) {
    const prevRow = rows[firstIndex - 1];
    if (prevRow.startChar !== undefined || prevRow.endChar !== undefined) {
      break;
    }
    firstIndex -= 1;
  }

  while (lastIndex < rows.length - 1) {
    const nextRow = rows[lastIndex + 1];
    if (nextRow.startChar !== undefined || nextRow.endChar !== undefined) {
      break;
    }
    lastIndex += 1;
  }

  return rows.slice(firstIndex, lastIndex + 1);
}

/**
 * Strips HTML comments except those inside code blocks
 */
function stripCommentsExceptInCode(html: string): string {
  // Protect comments inside code blocks
  const codeBlockPattern = /<pre[^>]*>[\s\S]*?<\/pre>|<code[^>]*>[\s\S]*?<\/code>/gi;
  const codeBlocks: string[] = [];
  let protectedHtml = html.replace(codeBlockPattern, (match) => {
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(match);
    return placeholder;
  });

  // Remove all HTML comments from the protected HTML
  protectedHtml = protectedHtml.replace(/<!--[\s\S]*?-->/g, '');

  // Restore code blocks
  codeBlocks.forEach((block, index) => {
    protectedHtml = protectedHtml.replace(`__CODE_BLOCK_${index}__`, block);
  });

  return protectedHtml;
}

/**
 * Calculates character range for a block by finding its text content in rag_text
 */
function calculateCharRange(
  htmlContent: string,
  ragText: string,
  startSearchIndex: number
): { start: number; end: number } | null {
  const plainText = stripHtmlTags(htmlContent);
  const normalizedText = normalizeText(plainText.trim());

  if (!normalizedText || normalizedText.length === 0) {
    return null;
  }

  // Search from the last found position (with some lookback for overlapping content)
  const searchStart = Math.max(0, startSearchIndex - 100);
  const foundIndex = ragText.indexOf(normalizedText, searchStart);

  if (foundIndex === -1) {
    return null;
  }

  return {
    start: foundIndex,
    end: foundIndex + normalizedText.length,
  };
}

/**
 * Gets the block element type from HTML content
 */
function getBlockElementType(fragment: string): string | undefined {
  const match = fragment.match(/<\s*\/?\s*([a-z0-9]+)/i);
  if (!match) {
    return undefined;
  }

  const tag = match[1].toLowerCase();
  return BLOCK_TAGS.has(tag) ? tag : undefined;
}

/**
 * Simplified: Converts HTML to block-based grid rows with character range metadata.
 * Each outermost block element = one grid row.
 * 
 * @param html The HTML content to convert (conversion_content)
 * @param ragText The cleaned RAG text (source of truth for character positions)
 * @returns Array of grid rows with character range metadata
 */
export function htmlToBlockGridRowsWithChars(
  html: string,
  ragText?: string
): BlockGridRowWithChars[] {
  if (!html) {
    return [];
  }
  
  // If no ragText provided, we can still create blocks without character ranges
  const hasRagText = !!ragText;

  // 1. Strip HTML comments (except those in code blocks)
  let cleanedHtml = stripCommentsExceptInCode(html);
  cleanedHtml = cleanedHtml.replace(/\r\n/g, '\n');

  // 2. Find all outermost block elements using a simple stack
  const rows: BlockGridRowWithChars[] = [];
  const regex = new RegExp(BLOCK_ELEMENT_REGEX);
  const stack: Array<{ tagName: string; startIndex: number }> = [];
  let ragTextIndex = 0;
  let blockNumber = 1;
  let match: RegExpExecArray | null;

  regex.lastIndex = 0;

  while ((match = regex.exec(cleanedHtml)) !== null) {
    const matchIndex = match.index;
    const matchLength = match[0].length;
    const isClosing = match[0].startsWith('</');
    // Extract tag name: closing tag </p>, opening tag <p>, or self-closing <img/>
    const tagMatch = match[0].match(/<\/(\w+)|<(\w+)/i);
    const tagName = tagMatch ? (tagMatch[1] || tagMatch[2] || '').toLowerCase() : '';

    if (!tagName || !BLOCK_TAGS.has(tagName)) {
      continue;
    }

    // Skip if this is an opening tag that's already been processed (duplicate match)
    // This can happen if the regex matches both opening and closing patterns
    if (!isClosing && !match[0].endsWith('/>') && !/<(img|hr)[^>]*>/i.test(match[0])) {
      // This is an opening tag - we'll handle it below
    }

    if (isClosing) {
      // Find matching opening tag in stack
      let matchingIndex = -1;
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].tagName === tagName) {
          matchingIndex = i;
          break;
        }
      }

      if (matchingIndex !== -1) {
        const openTag = stack[matchingIndex];
        
        // If this was at index 0 in the stack, it's a root-level block
        if (matchingIndex === 0) {
          const blockStart = openTag.startIndex;
          const blockEnd = matchIndex + matchLength;
          const blockContent = cleanedHtml.substring(blockStart, blockEnd);

          // Calculate character range (only if ragText is available)
          const charRange = hasRagText ? calculateCharRange(blockContent, ragText!, ragTextIndex) : null;
          const blockElementType = getBlockElementType(blockContent);

          // Embed block number and character range (if available) as HTML comment
          let contentWithComment = blockContent;
          if (charRange) {
            const comment = `<!-- block:${blockNumber} chars:${charRange.start}-${charRange.end} -->`;
            contentWithComment = comment + '\n' + blockContent;
            ragTextIndex = charRange.end;
          } else {
            // Even without character range, add block number comment for blocks without text (e.g., image-only paragraphs)
            const comment = `<!-- block:${blockNumber} -->`;
            contentWithComment = comment + '\n' + blockContent;
          }

          rows.push({
            lineNumber: blockNumber,
            content: contentWithComment,
            isBlockElement: blockElementType ? true : undefined,
            blockElementType,
            startChar: charRange?.start,
            endChar: charRange?.end,
          });

          blockNumber++;
        }

        // Remove this tag and all tags after it (they're nested inside)
        stack.splice(matchingIndex);
      }
    } else {
      // Opening tag or self-closing tag
      const isSelfClosing = match[0].endsWith('/>') || /<(img|hr)[^>]*>/i.test(match[0]);

      if (isSelfClosing) {
        // Self-closing tags like <img> and <hr> are ONLY blocks if stack is empty
        // If they're inside a <p> or other block, they're part of that block, not separate blocks
        // Only process if truly at root level (no parent blocks)
        if (stack.length === 0) {
          const blockContent = match[0];
          const charRange = hasRagText ? calculateCharRange(blockContent, ragText!, ragTextIndex) : null;
          const blockElementType = getBlockElementType(blockContent);

          let contentWithComment = blockContent;
          if (charRange) {
            const comment = `<!-- block:${blockNumber} chars:${charRange.start}-${charRange.end} -->`;
            contentWithComment = comment + '\n' + blockContent;
            ragTextIndex = charRange.end;
          } else {
            // Even without character range, add block number comment for blocks without text (e.g., standalone images)
            const comment = `<!-- block:${blockNumber} -->`;
            contentWithComment = comment + '\n' + blockContent;
          }

          rows.push({
            lineNumber: blockNumber,
            content: contentWithComment,
            isBlockElement: blockElementType ? true : undefined,
            blockElementType,
            startChar: charRange?.start,
            endChar: charRange?.end,
          });

          blockNumber++;
        }
        // If stack.length > 0, the self-closing tag is inside another block
        // Don't process it - it's part of the parent block's content
      } else {
        // Opening tag - add to stack
        stack.push({
          tagName,
          startIndex: matchIndex,
        });
      }
    }
  }

  return rows;
}

