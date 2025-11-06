// src/lib/chunker.ts
// Simple, token-agnostic chunker (~2k chars, 200 overlap)
export function chunkText(input: string, chunkSize = 2000, overlap = 200): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < input.length) {
    const end = Math.min(i + chunkSize, input.length);
    const slice = input.slice(i, end);
    chunks.push(slice);
    if (end === input.length) break;
    i = end - overlap;
  }
  return chunks;
}
