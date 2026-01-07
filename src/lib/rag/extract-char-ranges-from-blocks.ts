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

/**
 * Converts a character range to a block range
 * Finds the first and last blocks that contain or overlap with the given character range
 * 
 * @param htmlContent HTML content with embedded character range comments
 * @param startChar Starting character position (inclusive)
 * @param endChar Ending character position (inclusive)
 * @returns Block range { start_block, end_block } or null if not found
 */
export function convertCharRangeToBlockRange(
  htmlContent: string,
  startChar: number,
  endChar: number
): { start_block: number; end_block: number } | null {
  if (!htmlContent || startChar < 0 || endChar <= startChar) {
    return null;
  }

  // Extract all block-to-character mappings
  const allRanges = extractAllBlockCharRanges(htmlContent);

  if (allRanges.size === 0) {
    return null;
  }

  // Sort blocks by block number
  const sortedBlocks = Array.from(allRanges.entries()).sort((a, b) => a[0] - b[0]);

  // Find start block: first block that contains startChar or starts after startChar
  let startBlock: number | null = null;
  for (const [blockNum, range] of sortedBlocks) {
    // If this block contains startChar, use it
    if (range.start_char <= startChar && startChar <= range.end_char) {
      startBlock = blockNum;
      break;
    }
    // If we've passed startChar, check if previous block overlaps
    if (range.start_char > startChar) {
      const prevIndex = sortedBlocks.findIndex(([n]) => n === blockNum) - 1;
      if (prevIndex >= 0) {
        const prevRange = sortedBlocks[prevIndex][1];
        // If previous block ends at or after startChar, use it
        if (prevRange.end_char >= startChar) {
          startBlock = sortedBlocks[prevIndex][0];
        } else {
          // Otherwise use this block (it starts right after startChar)
          startBlock = blockNum;
        }
      } else {
        // No previous block, use this one
        startBlock = blockNum;
      }
      break;
    }
  }

  // If still not found, use the last block (startChar is beyond all blocks)
  if (startBlock === null && sortedBlocks.length > 0) {
    startBlock = sortedBlocks[sortedBlocks.length - 1][0];
  }

  // Find end block: last block that contains endChar or ends before endChar
  let endBlock: number | null = null;
  for (let i = sortedBlocks.length - 1; i >= 0; i--) {
    const [blockNum, range] = sortedBlocks[i];
    // If this block contains endChar, use it
    if (range.start_char <= endChar && endChar <= range.end_char) {
      endBlock = blockNum;
      break;
    }
    // If we've passed endChar going backwards, check if next block overlaps
    if (range.end_char < endChar) {
      const nextIndex = i + 1;
      if (nextIndex < sortedBlocks.length) {
        const nextRange = sortedBlocks[nextIndex][1];
        // If next block starts at or before endChar, use it
        if (nextRange.start_char <= endChar) {
          endBlock = sortedBlocks[nextIndex][0];
        } else {
          // Otherwise use this block (it ends right before endChar)
          endBlock = blockNum;
        }
      } else {
        // No next block, use this one
        endBlock = blockNum;
      }
      break;
    }
  }

  // If still not found, use the first block (endChar is before all blocks)
  if (endBlock === null && sortedBlocks.length > 0) {
    endBlock = sortedBlocks[0][0];
  }

  if (startBlock === null || endBlock === null) {
    return null;
  }

  return {
    start_block: startBlock,
    end_block: endBlock,
  };
}

