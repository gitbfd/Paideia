// src/lib/rag/extract-char-ranges-from-blocks.ts
// Extracts character ranges from HTML comments when blocks are selected
// Used to convert block selections (e.g., blocks 50-150) to character ranges for RAG queries

/**
 * Extracts character range from HTML comment for a specific block number
 * Format: <!-- block:50 chars:3000-40000 -->
 * 
 * @param htmlContent HTML content with embedded character range comments
 * @param blockNumber Block number to extract character range for
 * @returns Character range { start_char, end_char } or null if not found
 */
export function extractCharRangeForBlock(
  htmlContent: string,
  blockNumber: number
): { start_char: number; end_char: number } | null {
  if (!htmlContent || blockNumber < 1) {
    return null;
  }

  // Pattern to match: <!-- block:N chars:START-END -->
  // Match format: <!-- block:N chars:START-END --> (with or without spaces)
  const commentPattern = new RegExp(
    `<!--\\s*block:\\s*${blockNumber}\\s*chars:\\s*(\\d+)-(\\d+)\\s*-->`,
    'i'
  );

  const match = htmlContent.match(commentPattern);
  if (!match) {
    return null;
  }

  const startChar = parseInt(match[1], 10);
  const endChar = parseInt(match[2], 10);

  if (isNaN(startChar) || isNaN(endChar) || startChar < 0 || endChar <= startChar) {
    return null;
  }

  return {
    start_char: startChar,
    end_char: endChar,
  };
}

/**
 * Extracts character range for a range of blocks (e.g., blocks 50-150)
 * Returns the combined character range from the first block with a range to the last block with a range
 * Handles cases where some blocks don't have character ranges (e.g., empty blocks, images)
 * 
 * @param htmlContent HTML content with embedded character range comments
 * @param startBlock Starting block number (inclusive)
 * @param endBlock Ending block number (inclusive)
 * @returns Character range { start_char, end_char } or null if not found
 */
export function extractCharRangeForBlockRange(
  htmlContent: string,
  startBlock: number,
  endBlock: number
): { start_char: number; end_char: number } | null {
  if (!htmlContent || startBlock < 1 || endBlock < startBlock) {
    return null;
  }

  // Extract all block-to-character mappings
  const allRanges = extractAllBlockCharRanges(htmlContent);

  if (allRanges.size === 0) {
    return null;
  }

  // Find the first block in the range that has a character range
  let firstBlockWithRange: number | null = null;
  for (let block = startBlock; block <= endBlock; block++) {
    if (allRanges.has(block)) {
      firstBlockWithRange = block;
      break;
    }
  }

  // Find the last block in the range that has a character range
  let lastBlockWithRange: number | null = null;
  for (let block = endBlock; block >= startBlock; block--) {
    if (allRanges.has(block)) {
      lastBlockWithRange = block;
      break;
    }
  }

  // If no blocks in the range have character ranges, return null
  if (firstBlockWithRange === null || lastBlockWithRange === null) {
    return null;
  }

  const startRange = allRanges.get(firstBlockWithRange)!;
  const endRange = allRanges.get(lastBlockWithRange)!;

  // Return combined range from first block's start to last block's end
  return {
    start_char: startRange.start_char,
    end_char: endRange.end_char,
  };
}

/**
 * Extracts all block-to-character mappings from HTML content
 * Useful for debugging or building a lookup table
 * 
 * @param htmlContent HTML content with embedded character range comments
 * @returns Map of block number to character range
 */
export function extractAllBlockCharRanges(
  htmlContent: string
): Map<number, { start_char: number; end_char: number }> {
  const ranges = new Map<number, { start_char: number; end_char: number }>();

  if (!htmlContent) {
    return ranges;
  }

  // Pattern to match all block comments: <!-- block:N chars:START-END -->
  const commentPattern = /<!--\s*block:\s*(\d+)\s*chars:\s*(\d+)-(\d+)\s*-->/gi;

  let match;
  while ((match = commentPattern.exec(htmlContent)) !== null) {
    const blockNumber = parseInt(match[1], 10);
    const startChar = parseInt(match[2], 10);
    const endChar = parseInt(match[3], 10);

    if (!isNaN(blockNumber) && !isNaN(startChar) && !isNaN(endChar) && startChar >= 0 && endChar > startChar) {
      ranges.set(blockNumber, {
        start_char: startChar,
        end_char: endChar,
      });
    }
  }

  return ranges;
}

