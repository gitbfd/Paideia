// src/lib/display/html/to-grid-rows.ts
// Converts HTML content into grid rows for line-numbered display
// Each row represents one line, structured as [line number, content]

export interface GridRow {
  lineNumber: number;
  content: string; // HTML content for this row
  isBlockElement?: boolean; // True if this row represents a block element (not a <p>)
  blockElementType?: string; // Type of block element (h1, h2, img, etc.)
}


/**
 * Converts HTML content into an array of grid rows
 * Rules:
 * 1. Every block element CLOSE TAG creates a new grid row
 * 2. Text wraps naturally with CSS (no forced <br> tags)
 * 3. Existing <br> tags in the HTML create new grid rows
 * @param html The HTML content to convert
 * @param startLineNumber Starting line number (defaults to 1)
 * @returns Array of grid rows in original document order
 */
export function htmlToGridRows(html: string, startLineNumber: number = 1): GridRow[] {
  if (!html || html.trim().length === 0) {
    return [];
  }

  // Step 1: Remove empty paragraph tags first (they shouldn't create grid rows)
  // Empty paragraphs: <p></p>, <p> </p>, <p><br></p>, <p><br><br></p>, etc.
  // Also remove empty paragraphs that come after block elements like images
  // Match paragraphs that contain only whitespace and/or <br> tags
  // Use a more aggressive regex that matches any combination of whitespace and <br> tags
  let cleanedHtml = html.replace(/<p[^>]*>\s*(<br\s*\/?>\s*)*<\/p>/gi, '');
  
  // Also remove empty paragraphs that immediately follow block elements (images, headings, etc.)
  // This handles cases where markdown converters add empty <p></p> after images
  // Match: block element closing tag or self-closing element, optional whitespace, then empty <p></p>
  cleanedHtml = cleanedHtml.replace(/(<\/(h[1-6]|div|blockquote|ul|ol|table|pre|img|hr)[^>]*>|<(img|hr)[^>]*\/?>)\s*<p[^>]*>\s*<\/p>/gi, '$1');
  
  // Also remove empty paragraphs that come after <br> tags (which might be added after images)
  // Remove both the <br> and the empty <p></p> completely
  cleanedHtml = cleanedHtml.replace(/<br\s*\/?>\s*<p[^>]*>\s*<\/p>/gi, '');
  
  // Step 2: Split by block element closing tags AND existing <br> tags
  // Text wraps naturally with CSS - we don't insert <br> tags for wrapping
  // Only split on existing <br> tags that were in the original HTML
  const wrapped = cleanedHtml;
  
  // Step 3: Split by block element closing tags AND <br> tags
  // Block element closing tags: </h1>, </h2>, </h3>, </h4>, </h5>, </h6>, </div>, </blockquote>, </ul>, </ol>, </table>, </p>, </pre>
  // NOTE: We do NOT split on </li> - list items should stay within their list
  // Also include self-closing block elements: <img />, <hr />
  // Each of these should create a new row
  // Split AFTER the closing tag (include the closing tag in the current segment, then start new segment)
  const blockElementCloseRegex = /(<\/(h[1-6]|div|blockquote|ul|ol|table|p|pre)>|<(img|hr)[^>]*\/?>|<br\s*\/?>)/gi;
  
  const segments: string[] = [];
  let lastIndex = 0;
  let match;
  
  // Find all split points (block element closes and <br> tags)
  const splitPoints: Array<{ index: number; content: string; isBr: boolean }> = [];
  
  while ((match = blockElementCloseRegex.exec(wrapped)) !== null) {
    splitPoints.push({
      index: match.index,
      content: match[0],
      isBr: /<br\s*\/?>/i.test(match[0]),
    });
  }
  
  // Create segments by splitting AFTER each split point
  for (let i = 0; i < splitPoints.length; i++) {
    const splitPoint = splitPoints[i];
    const splitEnd = splitPoint.index + splitPoint.content.length;
    
    // Special case: if we have <br></p>, we want to keep them together in one segment
    // Check if the next split point is a </p> tag immediately after this <br>
    let shouldIncludeNext = false;
    if (splitPoint.isBr && i + 1 < splitPoints.length) {
      const nextPoint = splitPoints[i + 1];
      const gap = nextPoint.index - splitEnd;
      // If </p> immediately follows <br> (with only whitespace), include it
      if (gap >= 0 && gap < 10 && /<\/p>/i.test(nextPoint.content)) {
        shouldIncludeNext = true;
        // Include content up to and including the </p> tag
        const segmentEnd = nextPoint.index + nextPoint.content.length;
        if (segmentEnd > lastIndex) {
          const segment = wrapped.substring(lastIndex, segmentEnd);
          if (segment.trim().length > 0) {
            segments.push(segment);
          }
        }
        lastIndex = segmentEnd;
        i++; // Skip the next point since we've already processed it
        continue;
      }
    }
    
    // Include content up to and including the split point (for block elements)
    // For <br> tags, include the content AND the <br> tag so it renders as a line break
    if (splitPoint.isBr) {
      // <br> tag - include content up to and including the <br> tag
      if (splitEnd > lastIndex) {
        const segment = wrapped.substring(lastIndex, splitEnd);
        if (segment.trim().length > 0) {
          segments.push(segment);
        }
      }
    } else {
      // Block element closing tag - include it in the segment, then split
      if (splitEnd > lastIndex) {
        const segment = wrapped.substring(lastIndex, splitEnd);
        if (segment.trim().length > 0) {
          segments.push(segment);
        }
      }
    }
    
    lastIndex = splitEnd;
  }
  
  // Add remaining content after last split point
  if (lastIndex < wrapped.length) {
    const segment = wrapped.substring(lastIndex);
    if (segment.trim().length > 0) {
      segments.push(segment);
    }
  }
  
  // Step 3: Convert segments to grid rows
  const rows: GridRow[] = [];
  let currentLineNumber = startLineNumber;
  
  // First pass: identify segments to skip
  const segmentsToSkip = new Set<number>();
  for (let i = 0; i < segments.length; i++) {
    const trimmed = segments[i].trim();
    if (i > 0) {
      const prevTrimmed = segments[i - 1].trim();
      
      // If previous segment contains an image and current is empty <p></p>, skip the empty paragraph
      const prevHasImage = /<img[^>]*>/i.test(prevTrimmed);
      if (prevHasImage && /^<p[^>]*>\s*<\/p>$/i.test(trimmed)) {
        segmentsToSkip.add(i); // Skip the empty <p></p> after image
      }
      
      // If previous segment is <br> and current is empty <p></p>, skip both
      if (/^<br\s*\/?>$/i.test(prevTrimmed) && /^<p[^>]*>\s*<\/p>$/i.test(trimmed)) {
        segmentsToSkip.add(i - 1); // Skip the <br>
        segmentsToSkip.add(i); // Skip the empty <p></p>
      }
      
      // If previous segment ends with </p> that contains an image, and current is empty <p></p>, skip it
      if (/<\/p>$/i.test(prevTrimmed) && /<img[^>]*>/i.test(prevTrimmed) && /^<p[^>]*>\s*<\/p>$/i.test(trimmed)) {
        segmentsToSkip.add(i); // Skip the empty <p></p> after image paragraph
      }
    }
  }
  
  for (let i = 0; i < segments.length; i++) {
    // Skip segments marked in first pass
    if (segmentsToSkip.has(i)) {
      continue;
    }
    
    const segment = segments[i];
    // Skip empty segments
    const trimmed = segment.trim();
    if (trimmed.length === 0) {
      continue;
    }
    
    // Skip empty paragraph tags: <p></p>, <p><br></p>, <p> </p>, <p><br><br></p>, etc.
    // Match paragraphs that contain only whitespace and/or <br> tags
    if (/^<p[^>]*>(\s*<br\s*\/?>)*\s*<\/p>$/i.test(trimmed)) {
      continue;
    }
    
    // Skip segments that contain only <br> followed by empty <p></p>
    // This catches cases like <br><p></p> which might come after images
    // Match: optional <br> tags, then empty <p></p>, then optional <br> tags
    if (/^(<br\s*\/?>\s*)*<p[^>]*>\s*<\/p>(\s*<br\s*\/?>)*$/i.test(trimmed)) {
      continue;
    }
    
    // Also skip segments that are just <br> tags (they might be leftover from removed empty paragraphs)
    // But only if they don't have any other content
    if (/^<br\s*\/?>$/i.test(trimmed)) {
      continue;
    }
    
    // Skip segments that are just opening tags (like <p>, <p class="...">, etc.)
    if (/^<p[^>]*>(\s*<br\s*\/?>)*\s*$/i.test(trimmed)) {
      continue;
    }
    
    // Skip segments that are just closing tags (like </p>)
    // BUT: if it's </p> after content, we need to keep it to apply paragraph spacing
    // We'll handle this by checking if the segment ends with </p> and has content before it
    const endsWithParagraphClose = /<\/p>$/i.test(trimmed);
    if (/^<\/p>$/i.test(trimmed) && !trimmed.match(/<[^>]+>.*<\/p>$/i)) {
      // This is just a closing tag with no content - skip it
      continue;
    }
    
    // Skip segments that contain only HTML tags and no actual text content
    // EXCEPT for self-closing elements like <img>, <hr>, <br> which are valid content
    // This catches cases like <p><br> or just tags, but allows <img> tags
    const hasSelfClosingElement = /<(img|hr|br)[^>]*\/?>/i.test(trimmed);
    let hasVisibleContent = true;
    if (!hasSelfClosingElement) {
      const textContent = trimmed.replace(/<[^>]*>/g, '').trim();
      if (textContent.length === 0) {
        // Check if it's just a <br> tag (which we already handle as spacing)
        if (/^<br\s*\/?>$/i.test(trimmed)) {
          hasVisibleContent = false;
        } else {
          continue;
        }
      }
    }
    
    const blockElementType = getBlockElementType(segment);
    rows.push({
      lineNumber: hasVisibleContent ? currentLineNumber++ : -1, // Use -1 for rows with no visible content
      content: segment,
      isBlockElement: !!blockElementType,
      blockElementType: blockElementType,
    });
    
    // After a paragraph closing tag, add an empty row ONLY if the next segment starts with <p>
    // This creates spacing between consecutive paragraphs, but not between paragraphs and other block elements
    // NOTE: We don't assign a line number to empty spacing rows - they're just for visual spacing
    if (endsWithParagraphClose && trimmed.match(/<[^>]+>.*<\/p>$/i)) {
      // Check if there's a next segment and if it starts with a <p> tag
      if (i + 1 < segments.length) {
        const nextSegment = segments[i + 1].trim();
        if (/^<p[^>]*>/i.test(nextSegment)) {
          // Next segment is a paragraph, so add spacing
          // Don't assign a line number - this is just visual spacing
          rows.push({
            lineNumber: -1, // Use -1 to indicate no line number should be displayed
            content: '<br>',
            isBlockElement: false,
          });
        }
      }
    }
  }
  
  return rows;
}


/**
 * Determines if a line contains a block element and returns its type
 * @param line The line content
 * @returns Block element type (h1, h2, img, etc.) or undefined if not a block element
 */
function getBlockElementType(line: string): string | undefined {
  // Check for block element opening tags
  const blockElementMatch = line.match(/<(h[1-6]|img|div|blockquote|ul|ol|li|table|hr|pre)[^>]*>/i);
  if (blockElementMatch) {
    return blockElementMatch[1].toLowerCase();
  }
  return undefined;
}




/**
 * Extracts a specific range of grid rows
 * @param rows All grid rows
 * @param startLine Starting line number (1-indexed, inclusive)
 * @param endLine Ending line number (1-indexed, inclusive)
 * @returns Array of grid rows in the specified range
 */
export function extractGridRowRange(rows: GridRow[], startLine: number, endLine: number): GridRow[] {
  return rows.filter(row => row.lineNumber >= startLine && row.lineNumber <= endLine);
}

