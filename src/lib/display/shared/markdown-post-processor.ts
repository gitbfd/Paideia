// src/lib/display/shared/markdown-post-processor.ts
// Custom post-processing rules for markdown-to-HTML conversion
// These rules are applied after standard GFM conversion

/**
 * Post-processes HTML to ensure standalone images are wrapped in <p> tags.
 * Images that are already inside <p> tags (inline images) are left unchanged.
 * 
 * Note: This is a custom rule that alters standard GFM output.
 * Standard GFM renders images as block-level elements without wrapping.
 */
export function wrapStandaloneImages(html: string): string {
  // Strategy: Use a simple stack to track when we're inside a <p> tag
  // Find all <img> tags and check if they're inside a <p> tag
  
  const imgRegex = /<img[^>]*>/gi;
  const matches: Array<{ match: string; index: number }> = [];
  let match: RegExpExecArray | null;
  
  // Find all image tags
  while ((match = imgRegex.exec(html)) !== null) {
    matches.push({ match: match[0], index: match.index });
  }
  
  // Process in reverse order to preserve indices
  let result = html;
  for (let i = matches.length - 1; i >= 0; i--) {
    const { match: imgTag, index } = matches[i];
    
    // Check if this image is inside a <p> tag by looking at the HTML before it
    const beforeHtml = html.substring(0, index);
    
    // Count unclosed <p> tags before this image
    const openPTags = (beforeHtml.match(/<p[^>]*>/gi) || []).length;
    const closePTags = (beforeHtml.match(/<\/p>/gi) || []).length;
    const isInsideP = openPTags > closePTags;
    
    if (!isInsideP) {
      // This is a standalone image - wrap it in <p> tags
      result = result.substring(0, index) + `<p>${imgTag}</p>` + result.substring(index + imgTag.length);
    }
  }
  
  return result;
}

/**
 * Applies all custom post-processing rules to markdown-converted HTML
 * @param html The HTML output from standard GFM conversion
 * @returns HTML with custom rules applied
 */
export function postProcessMarkdownHtml(html: string): string {
  // Apply custom rules in order
  html = wrapStandaloneImages(html);
  
  // Future custom rules can be added here
  
  return html;
}

