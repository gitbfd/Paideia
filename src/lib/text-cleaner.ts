// src/lib/text-cleaner.ts
export function normalizeText(txt: string): string {
  return txt
    .replace(/(\w)-\n(\w)/g, '$1$2')     // de-hyphenate line-wraps
    .replace(/[^\S\r\n]+\n/g, '\n')      // trim spaces before newline
    .replace(/\n{3,}/g, '\n\n')          // collapse blank lines
    .replace(/[^\S\r\n]{2,}/g, ' ')      // collapse spaces
    .replace(/\ufb01/g, 'fi')            // ligatures
    .replace(/\ufb02/g, 'fl')
    .replace(/([^\n])\n(?!\n)/g, '$1 ')  // unwrap single linebreaks within paragraphs
    .trim();
}
