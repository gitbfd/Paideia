// src/app/admin/texts/[id]/documents/[documentId]/preview/api/extract-char-ranges/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClientForRoute } from '@/lib/supabase/route';
import { htmlToBlockGridRowsWithChars } from '@/lib/display/html';
import { extractCharRangeForBlockRange } from '@/lib/rag';

// POST /admin/texts/:id/documents/:documentId/preview/api/extract-char-ranges
// Extracts character ranges from HTML comments for a given block range
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const { supabase, applyCookies } = createClientForRoute(req);
  const { documentId } = await params;

  try {
    const body = await req.json();
    const { startBlock, endBlock } = body;

    if (!startBlock || !endBlock || startBlock < 1 || endBlock < startBlock) {
      return applyCookies(
        NextResponse.json(
          { error: 'Invalid block range. startBlock and endBlock must be valid numbers with startBlock >= 1 and endBlock >= startBlock' },
          { status: 400 }
        )
      );
    }

    // Get conversion_content (raw HTML) and rag_text from the document
    const { data: document, error } = await supabase
      .from('text_documents')
      .select('conversion_content, display_content, rag_text')
      .eq('id', documentId)
      .single();

    if (error) {
      return applyCookies(NextResponse.json({ error: error.message }, { status: 400 }));
    }

    if (!document) {
      return applyCookies(NextResponse.json({ error: 'Document not found' }, { status: 404 }));
    }

    // Use conversion_content (raw HTML) as the source, fallback to display_content
    const htmlContent = document.conversion_content || document.display_content;

    if (!htmlContent) {
      return applyCookies(
        NextResponse.json(
          { error: 'Conversion content not available. Please re-ingest the document.' },
          { status: 404 }
        )
      );
    }

    // Check if rag_text is available (required for character range calculation)
    if (!document.rag_text) {
      return applyCookies(
        NextResponse.json(
          {
            error: 'RAG text not available. Please re-ingest the document to enable character range extraction.',
          },
          { status: 400 }
        )
      );
    }

    // Process the HTML through htmlToBlockGridRowsWithChars to get HTML with character range comments
    const gridRows = htmlToBlockGridRowsWithChars(
      htmlContent,
      document.rag_text
    );

    // Check if we have enough blocks
    if (gridRows.length < endBlock) {
      return applyCookies(
        NextResponse.json(
          {
            error: `Document only has ${gridRows.length} blocks, but requested range is ${startBlock}-${endBlock}.`,
          },
          { status: 400 }
        )
      );
    }

    // Extract character ranges from the processed grid rows
    // The comments are embedded in the row.content
    const processedHtml = gridRows.map((row) => row.content).join('\n');

    // Debug: Check if comments are present
    const commentPattern = /<!--\s*block:\s*(\d+)\s*chars:\s*(\d+)-(\d+)\s*-->/gi;
    const allComments = Array.from(processedHtml.matchAll(commentPattern));
    const foundBlocks = new Set(allComments.map(m => parseInt(m[1], 10)));

    // Extract character range for the block range
    // This will find the first and last blocks WITH character ranges in the requested range
    const charRange = extractCharRangeForBlockRange(processedHtml, startBlock, endBlock);

    if (!charRange) {
      // Find which blocks in the range have character ranges
      const blocksInRange = Array.from({ length: endBlock - startBlock + 1 }, (_, i) => startBlock + i);
      const blocksWithRangesInRange = blocksInRange.filter(block => foundBlocks.has(block));
      
      let errorMessage = `Could not extract character range for blocks ${startBlock}-${endBlock}.`;
      if (blocksWithRangesInRange.length === 0) {
        errorMessage += ` No blocks in this range have character ranges.`;
      } else {
        errorMessage += ` Only ${blocksWithRangesInRange.length} of ${blocksInRange.length} blocks in this range have character ranges.`;
      }
      errorMessage += ` Found ${foundBlocks.size} blocks with character ranges out of ${gridRows.length} total blocks. Some blocks (like empty blocks or images) don't have character ranges because they don't contain text that maps to RAG text.`;

      return applyCookies(
        NextResponse.json(
          {
            error: errorMessage,
            debug: {
              totalBlocks: gridRows.length,
              blocksWithRanges: foundBlocks.size,
              blocksInRequestedRange: blocksInRange.length,
              blocksWithRangesInRange: blocksWithRangesInRange.length,
              sampleComments: allComments.slice(0, 5).map(m => ({
                block: parseInt(m[1], 10),
                range: `${m[2]}-${m[3]}`,
              })),
            },
          },
          { status: 404 }
        )
      );
    }

    return applyCookies(
      NextResponse.json(
        {
          start_char: charRange.start_char,
          end_char: charRange.end_char,
        },
        { status: 200 }
      )
    );
  } catch (err) {
    console.error('[extract-char-ranges] Error:', err);
    return applyCookies(
      NextResponse.json(
        { error: err instanceof Error ? err.message : 'Unknown error occurred' },
        { status: 500 }
      )
    );
  }
}

