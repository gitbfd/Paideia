// src/components/LineNumberedContent.tsx
'use client';

import { previewStylesConfig, type GridRow } from '@/lib/display';

type Props = {
  gridRows?: GridRow[]; // Grid rows to display (line-based approach)
  startLine?: number; // Starting line number (defaults to 1)
  // Legacy props for backward compatibility (will be removed)
  content?: string;
  lineCount?: number;
  useExactLineCount?: boolean;
};

export default function LineNumberedContent({ 
  gridRows,
  startLine = 1,
  // Legacy props
  content,
  lineCount,
  useExactLineCount
}: Props) {
  // If gridRows is provided, use the line-based grid approach
  if (gridRows && gridRows.length > 0) {
    // Find first and last <p> tags for margin styling
    const pTagIndices: number[] = [];
    gridRows.forEach((row, index) => {
      if (row.content.includes('<p') && !row.isBlockElement) {
        pTagIndices.push(index);
      }
    });

    return (
      <div className="text-preview-with-lines-grid">
        <div className="text-preview-grid-container">
          {gridRows.map((row, index) => {
            const isFirstP = pTagIndices.length > 0 && index === pTagIndices[0];
            const isLastP = pTagIndices.length > 0 && index === pTagIndices[pTagIndices.length - 1];
            const isP = row.content.includes('<p') && !row.isBlockElement;
            
            // Add class to line number cell based on block element type (for margin matching)
            const lineNumberCellClass = row.blockElementType 
              ? `line-number-${row.blockElementType}` 
              : '';
            
            // Skip rendering line number if lineNumber is -1 (empty spacing row)
            const shouldShowLineNumber = row.lineNumber !== -1;
            
            // Use index as key to ensure uniqueness (since lineNumber can be -1 for multiple rows)
            return (
              <div key={index} className="text-preview-grid-row">
                {shouldShowLineNumber ? (
                  <div 
                    className={`text-preview-line-number-cell ${lineNumberCellClass}`}
                    style={row.blockElementType === 'img' || row.blockElementType === 'pre'
                      ? { alignItems: 'center', alignSelf: 'stretch' } 
                      : undefined}
                  >
                    {row.lineNumber}
                  </div>
                ) : (
                  <div className="text-preview-line-number-cell" style={{ visibility: 'hidden' }}>
                    {/* Empty cell for spacing rows - no line number displayed */}
                  </div>
                )}
                <div 
                  className={`text-preview-content-cell ${isP ? 'paragraph-cell' : ''} ${isFirstP ? 'first-paragraph' : ''} ${isLastP ? 'last-paragraph' : ''}`}
                  dangerouslySetInnerHTML={{ __html: row.content }}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Legacy support: fall back to old approach if content is provided
  // This maintains backward compatibility with the preview page
  // TODO: Update preview page to use gridRows as well
  return (
    <div className="text-preview-with-lines">
      <div className="text-preview-content-wrapper">
        <div
          className="p-6 font-serif leading-relaxed text-preview-content max-w-none"
          style={{ lineHeight: String(previewStylesConfig.baseLineHeight) }}
          dangerouslySetInnerHTML={{ __html: content || '' }}
        />
      </div>
    </div>
  );
}

