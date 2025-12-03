// src/lib/display/html/index.ts
// HTML processing utilities for display

export { htmlToGridRows, extractGridRowRange, type GridRow } from './to-grid-rows';
export { htmlToBlockGridRowsWithChars, filterBlockRowsByCharRange, type BlockGridRowWithChars } from './to-block-grid-rows-with-chars';
export { wrapHtmlContent, getWrappedHtmlBlockCount } from './block-counter';

