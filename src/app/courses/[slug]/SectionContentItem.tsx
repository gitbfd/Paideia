// src/app/courses/[slug]/SectionContentItem.tsx
// Single text section - fetches display_grid_rows (cached), lazy streams in

import LineNumberedContent from '@/components/LineNumberedContent';
import { getCachedSectionGridRows } from '@/lib/courses/course-data';
import type { SectionForSidebar } from '@/lib/courses/course-data';

type Props = {
  section: SectionForSidebar;
};

export default async function SectionContentItem({ section }: Props) {
  const docId = section.text_document_id;
  const startBlock = section.start_block ?? 1;
  const endBlock = section.end_block ?? 1;

  let gridRows: Awaited<ReturnType<typeof getCachedSectionGridRows>> = [];
  if (docId) {
    gridRows = await getCachedSectionGridRows(docId, startBlock, endBlock);
  }

  const textTitle = section.textTitle || 'Untitled Text';
  const textAuthor = section.textAuthor;
  const sectionTitle = section.title;

  return (
    <div
      id={`section-${section.id}`}
      className="bg-white rounded-lg shadow-sm border overflow-hidden"
    >
      <div className="p-4 border-b bg-gray-50">
        <div className="font-semibold text-xs text-gray-500">
          {textTitle}
          {textAuthor ? (
            <span className="text-gray-600 font-normal">
              {' by '}
              {textAuthor}
            </span>
          ) : null}
        </div>
        {sectionTitle ? (
          <div className="font-semibold text-lg text-gray-900 mt-1">
            {sectionTitle}
          </div>
        ) : null}
      </div>
      {gridRows.length > 0 ? (
        <div className="bg-white">
          <LineNumberedContent
            gridRows={gridRows}
            startLine={gridRows[0]?.lineNumber || 1}
          />
        </div>
      ) : (
        <div className="p-6 text-sm text-gray-500 italic">
          Text content not available. This section may need to be re-ingested.
        </div>
      )}
    </div>
  );
}
