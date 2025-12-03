// src/lib/shared/normalize-text.ts
// Cross-stage text normalization utility
// Used in both INGEST (extractors) and DISPLAY (character range matching)

import { textProcessingConfig } from '../ingest/shared/config';

export function normalizeText(txt: string): string {
  const config = textProcessingConfig.normalization;
  let result = txt;

  if (config.dehyphenateLineWraps) {
    result = result.replace(/(\w)-\n(\w)/g, '$1$2');
  }
  if (config.trimSpacesBeforeNewline) {
    result = result.replace(/[^\S\r\n]+\n/g, '\n\n');
  }
  if (config.collapseBlankLines) {
    result = result.replace(/\n{3,}/g, '\n');
  }
  if (config.collapseSpaces) {
    result = result.replace(/[^\S\r\n]{2,}/g, ' ');
  }
  if (config.fixLigatures) {
    result = result.replace(/\ufb01/g, 'fi').replace(/\ufb02/g, 'fl');
  }
  if (config.unwrapSingleLinebreaks) {
    result = result.replace(/([^\n])\n(?!\n)/g, '$1 ');
  }

  return result.trim();
}

