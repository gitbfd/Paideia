// src/lib/line-height-calculator.ts
// Calculates line units for different HTML elements based on CSS styling
// Uses shared config from preview-styles-config.ts

import { previewStylesConfig, getElementStyle } from './preview-styles-config';

const BASE_LINE_HEIGHT = previewStylesConfig.baseLineHeight;

/**
 * Calculates how many line units an element takes based on its CSS styling
 * @param tagName The HTML tag name (e.g., 'p', 'h1', 'div')
 * @param hasContent Whether the element has text content
 * @returns Number of line units (can be fractional)
 */
export function getElementLineUnits(tagName: string, hasContent: boolean): number {
  const styles = getElementStyle(tagName);
  
  // Calculate total height in line units
  // margin-top + (font-size * line-height if has content) + margin-bottom
  let lineUnits = styles.marginTop;
  
  if (hasContent) {
    // The element itself takes up space based on font-size * line-height
    // But we need to convert this to base line-height units
    const elementHeight = styles.fontSize * styles.lineHeight;
    lineUnits += elementHeight / BASE_LINE_HEIGHT;
  }
  
  lineUnits += styles.marginBottom;
  
  return Math.max(0.5, lineUnits); // At least 0.5 line units
}

/**
 * Parses HTML and calculates total line units needed
 * @param html The HTML content
 * @returns Total line units
 */
export function calculateTotalLineUnits(html: string): number {
  if (!html || html.trim().length === 0) {
    return 1;
  }

  let totalUnits = 0;
  let inTag = false;
  let currentTag = '';
  let tagType: 'opening' | 'closing' | 'self-closing' = 'opening';
  let currentElementContent = '';
  let currentElementTag = '';
  
  for (let i = 0; i < html.length; i++) {
    const char = html[i];
    const nextChar = i < html.length - 1 ? html[i + 1] : '';
    
    if (char === '<') {
      // Save any accumulated content before entering tag
      if (currentElementContent.trim().length > 0 && currentElementTag) {
        const units = getElementLineUnits(currentElementTag, true);
        totalUnits += units;
        currentElementContent = '';
      }
      
      inTag = true;
      currentTag = '';
      if (nextChar === '/') {
        tagType = 'closing';
      } else if (nextChar === '!' || (nextChar === 'b' && html.substring(i, i + 5) === '<br')) {
        // Handle <br> tags and comments
        if (html.substring(i, i + 4).toLowerCase() === '<br') {
          totalUnits += 1; // <br> creates 1 line unit
        }
      } else {
        tagType = 'opening';
      }
    } else if (char === '>') {
      inTag = false;
      const tagLower = currentTag.toLowerCase().trim();
      
      if (tagType === 'opening' && !tagLower.startsWith('br')) {
        // Opening tag - start tracking this element
        const tagName = tagLower.split(/\s/)[0];
        currentElementTag = tagName;
        currentElementContent = '';
      } else if (tagType === 'closing') {
        // Closing tag - finalize the element
        const tagName = tagLower.replace('/', '').split(/\s/)[0];
        if (tagName === currentElementTag && currentElementContent.trim().length > 0) {
          const units = getElementLineUnits(tagName, true);
          totalUnits += units;
        } else if (tagName === currentElementTag) {
          // Empty element still takes up space
          const units = getElementLineUnits(tagName, false);
          totalUnits += units;
        }
        currentElementTag = '';
        currentElementContent = '';
      }
      currentTag = '';
    } else if (inTag) {
      currentTag += char;
    } else {
      // Text content
      if (currentElementTag) {
        currentElementContent += char;
      } else {
        // Text outside any element - count as base line
        if (char.trim().length > 0 && currentElementContent.length === 0) {
          totalUnits += 1;
        }
      }
    }
  }
  
  // Handle any remaining content
  if (currentElementContent.trim().length > 0 && currentElementTag) {
    const units = getElementLineUnits(currentElementTag, true);
    totalUnits += units;
  }
  
  return Math.max(1, Math.ceil(totalUnits));
}

