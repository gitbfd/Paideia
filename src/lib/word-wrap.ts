// src/lib/word-wrap.ts
// Utility to wrap text at a given character count without breaking words
import { lineWrapConfig } from './line-wrap-config';

/**
 * Wraps text at the specified character count per line, breaking only at word boundaries
 * Preserves existing newlines and wraps each paragraph separately
 * @param text The text to wrap
 * @param maxChars Maximum characters per line (defaults to lineWrapConfig.maxCharsPerLine)
 * @returns Array of lines
 */
export function wrapText(text: string, maxChars: number = lineWrapConfig.maxCharsPerLine): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const allLines: string[] = [];
  
  // Split by newlines first to preserve paragraph breaks
  const paragraphs = text.split(/\r?\n/);
  
  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (trimmed.length === 0) {
      // Preserve empty lines
      allLines.push('');
      continue;
    }

    // Wrap this paragraph
    const words = trimmed.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      // If adding this word would exceed the limit, start a new line
      if (currentLine.length > 0 && (currentLine + ' ' + word).length > maxChars) {
        allLines.push(currentLine);
        currentLine = word;
      } else {
        // Add word to current line
        if (currentLine.length > 0) {
          currentLine += ' ' + word;
        } else {
          currentLine = word;
        }
      }
    }

    // Add the last line of this paragraph if it's not empty
    if (currentLine.length > 0) {
      allLines.push(currentLine);
    }
  }

  return allLines;
}

/**
 * Wraps text and returns the line count
 * @param text The text to wrap
 * @param maxChars Maximum characters per line (defaults to lineWrapConfig.maxCharsPerLine)
 * @returns Number of lines
 */
export function getWrappedLineCount(text: string, maxChars: number = lineWrapConfig.maxCharsPerLine): number {
  const lines = wrapText(text, maxChars);
  return lines.length || 1; // At least 1 line if text exists
}

