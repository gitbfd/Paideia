// src/lib/text-preview-styles.ts
// Shared CSS styles for text preview views (Text Preview and Course view)
import { previewStylesConfig } from './preview-styles-config';

/**
 * Generates CSS styles from the shared config
 * This ensures CSS and line-height calculations stay in sync across all preview views
 */
export function generateTextPreviewStyles(): string {
  const { baseLineHeight, elements } = previewStylesConfig;
  
  let css = `
    /* Legacy flex-based layout styles */
    .text-preview-with-lines {
      display: flex;
      font-family: 'Courier New', monospace;
    }
    .text-preview-line-numbers {
      padding-right: 1rem;
      padding-top: 1.5rem;
      padding-bottom: 1.5rem;
      text-align: right;
      color: #6b7280;
      user-select: none;
      border-right: 1px solid #e5e7eb;
      min-width: 4rem;
      font-size: 0.875rem;
      line-height: ${baseLineHeight};
      background-color: #f9fafb;
    }
    .text-preview-content-wrapper {
      flex: 1;
      padding-left: 1rem;
      overflow-x: auto;
    }
    .text-preview-content {
      color: #1f2937 !important;
    }
    .text-preview-content p {
      margin-bottom: ${elements.p.marginBottom}em !important;
      color: #1f2937 !important;
    }
    .text-preview-content a {
      color: #2563eb !important;
      text-decoration: underline !important;
    }
    .text-preview-content a:hover {
      color: #1d4ed8 !important;
    }
    
    /* Grid-based layout styles */
    .text-preview-with-lines-grid {
      font-family: 'Courier New', monospace;
    }
    .text-preview-grid-container {
      display: grid;
      grid-template-columns: 4rem 1fr;
      border-right: 1px solid #e5e7eb;
      align-items: baseline;
    }
    .text-preview-grid-row {
      display: contents;
    }
    .text-preview-line-number-cell {
      padding-right: 1rem;
      text-align: right;
      color: #6b7280;
      user-select: none;
      background-color: #f9fafb;
      font-size: 0.875rem;
      line-height: ${baseLineHeight};
      border-right: 1px solid #e5e7eb;
      display: flex;
      align-items: baseline;
      justify-content: flex-end;
    }
    /* Center line numbers vertically for images and <pre> elements */
    .text-preview-line-number-cell.line-number-img,
    .text-preview-line-number-cell.line-number-pre {
      align-items: center !important;
      align-self: stretch !important;
    }
    .text-preview-content-cell {
      padding-left: 1rem;
      font-family: serif;
      line-height: ${baseLineHeight};
      color: #1f2937;
    }
    .text-preview-content-cell.paragraph-cell {
      margin: 0 !important;
    }
    .text-preview-content-cell.paragraph-cell.first-paragraph p {
      margin-top: ${elements.p.marginTop}em !important;
      margin-bottom: 0 !important;
    }
    .text-preview-content-cell.paragraph-cell.last-paragraph p {
      margin-top: 0 !important;
      margin-bottom: ${elements.p.marginBottom}em !important;
    }
    .text-preview-content-cell.paragraph-cell:not(.first-paragraph):not(.last-paragraph) p {
      margin-top: 0 !important;
      margin-bottom: 0 !important;
    }
    .text-preview-content-cell a {
      color: #2563eb !important;
      text-decoration: underline !important;
    }
    .text-preview-content-cell a:hover {
      color: #1d4ed8 !important;
    }
  `;
  
  // Generate styles for headings (h1-h6)
  for (let i = 1; i <= 6; i++) {
    const tag = `h${i}`;
    const style = elements[tag];
    if (style) {
      css += `
        .text-preview-content ${tag},
        .text-preview-content-cell ${tag} {
          font-size: ${style.fontSize}rem !important;
          ${style.fontWeight ? `font-weight: ${style.fontWeight} !important;` : ''}
          line-height: ${style.lineHeight} !important;
          margin-top: ${style.marginTop}em !important;
          margin-bottom: ${style.marginBottom}em !important;
          color: #111827 !important;
        }
        /* Match line number margin-bottom to header margin-bottom */
        .text-preview-line-number-cell.line-number-${tag} {
          margin-bottom: ${style.marginBottom}em !important;
        }
      `;
    }
  }
  
  // Generate styles for blockquotes
  if (elements.blockquote) {
    const style = elements.blockquote;
    css += `
      .text-preview-content blockquote,
      .text-preview-content-cell blockquote {
        font-size: ${style.fontSize}rem !important;
        line-height: ${style.lineHeight} !important;
        margin-top: ${style.marginTop}em !important;
        margin-bottom: ${style.marginBottom}em !important;
        color: #1f2937 !important;
        border-left: 4px solid #e5e7eb !important;
        padding-left: 1em !important;
        font-style: italic !important;
      }
      /* Match line number margin-bottom to blockquote margin-bottom */
      .text-preview-line-number-cell.line-number-blockquote {
        margin-bottom: ${style.marginBottom}em !important;
      }
    `;
  }
  
  // List styles for both legacy and grid-based layouts
  css += `
    .text-preview-content ul,
    .text-preview-content-cell ul {
      list-style-type: disc;
      margin-left: 1.5em;
      margin-top: 0;
      margin-bottom: 0;
      padding-left: 0.5em;
    }
    .text-preview-content ol,
    .text-preview-content-cell ol {
      list-style-type: decimal;
      margin-left: 1.5em;
      margin-top: 0;
      margin-bottom: 0;
      padding-left: 0.5em;
    }
    .text-preview-content li,
    .text-preview-content-cell li {
      margin-top: 0;
      margin-bottom: 0;
      display: list-item;
    }
  `;
  
  return css;
}

