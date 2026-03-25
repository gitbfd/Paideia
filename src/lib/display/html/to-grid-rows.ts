// src/lib/display/html/to-grid-rows.ts
// Grid row type for line-numbered display.
// Block-based display uses htmlToBlockGridRowsWithChars from to-block-grid-rows-with-chars.

export interface GridRow {
  lineNumber: number;
  content: string; // HTML content for this row
  isBlockElement?: boolean; // True if this row represents a block element (not a <p>)
  blockElementType?: string; // Type of block element (h1, h2, img, etc.)
}


