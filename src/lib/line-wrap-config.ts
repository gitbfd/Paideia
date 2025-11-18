// src/lib/line-wrap-config.ts
// Configuration for line wrapping in text previews

export interface LineWrapConfig {
  maxCharsPerLine: number; // Maximum characters per line before wrapping
}

export const lineWrapConfig: LineWrapConfig = {
  maxCharsPerLine: 100,
};

