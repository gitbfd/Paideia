// src/components/LineNumberedContent.tsx
'use client';

import { type GridRow } from '@/lib/display';

type Props = {
  gridRows?: GridRow[]; // Grid rows to display (line-based approach)
  startLine?: number; // Starting line number (defaults to 1)
};

export default function LineNumberedContent({ 
  gridRows,
  startLine = 1,
}: Props) {
  if (!gridRows || gridRows.length === 0) {
    return (
      <div className="p-6 text-sm text-gray-500 italic">
        No content available.
      </div>
    );
  }

  // Use the line-based grid approach
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

