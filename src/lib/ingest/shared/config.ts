// src/lib/ingest/shared/config.ts
// Configuration for text processing and display formatting

export interface TextProcessingConfig {
  // Text normalization/cleaning settings
  normalization: {
    dehyphenateLineWraps: boolean;      // Remove hyphens at line breaks (e.g., "word-\nword" -> "wordword")
    trimSpacesBeforeNewline: boolean;   // Remove trailing spaces before newlines
    collapseBlankLines: boolean;        // Collapse 3+ blank lines to 2
    collapseSpaces: boolean;            // Collapse multiple spaces to single space
    fixLigatures: boolean;              // Convert ligatures (fi, fl) to regular characters
    unwrapSingleLinebreaks: boolean;    // Convert single linebreaks within paragraphs to spaces
  };
  
  // HTML conversion settings
  htmlConversion: {
    markdownToHtml: boolean;            // Convert markdown to HTML
    preserveLineBreaks: boolean;        // Convert line breaks to <br> tags for plain text
    escapeHtml: boolean;                // Escape HTML in plain text (for security)
    wrapInParagraphs: boolean;          // Wrap text blocks in <p> tags
  };
  
  // Display settings
  display: {
    maxPreviewHeight: string;          // Max height for preview (e.g., "24rem")
    fontFamily: string;                 // Font family for display
    lineHeight: string;                 // Line height for readability
    paragraphSpacing: string;          // Spacing after paragraphs (e.g., "1.5em")
  };
}

export const defaultTextProcessingConfig: TextProcessingConfig = {
  normalization: {
    dehyphenateLineWraps: true,
    trimSpacesBeforeNewline: true,
    collapseBlankLines: true,
    collapseSpaces: true,
    fixLigatures: true,
    unwrapSingleLinebreaks: true,
  },
  htmlConversion: {
    markdownToHtml: true,
    preserveLineBreaks: true,
    escapeHtml: true,
    wrapInParagraphs: true,
  },
  display: {
    maxPreviewHeight: "24rem", // 96 * 0.25rem = 24rem (equivalent to max-h-96)
    fontFamily: "serif",
    lineHeight: "relaxed",
    paragraphSpacing: "1.5em", // Spacing after paragraphs
  },
};

// Export the active config (can be overridden if needed)
export const textProcessingConfig = defaultTextProcessingConfig;

