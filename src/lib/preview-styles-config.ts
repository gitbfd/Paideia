// src/lib/preview-styles-config.ts
// Shared configuration for preview styles - used by both CSS and line-height calculator
// Update values here to keep CSS and line counting in sync

export interface ElementStyle {
  fontSize: number; // in rem
  lineHeight: number; // multiplier
  marginTop: number; // in em
  marginBottom: number; // in em
  fontWeight?: number;
}

export interface PreviewStylesConfig {
  baseLineHeight: number; // Base line height for content (from .text-preview-content-wrapper)
  elements: Record<string, ElementStyle>;
}

export const previewStylesConfig: PreviewStylesConfig = {
  // Base line height from .text-preview-content-wrapper style: lineHeight: '1.75'
  baseLineHeight: 1.75,
  elements: {
    'p': {
      fontSize: 1, // 1rem (default)
      lineHeight: 1.75, // matches base
      marginTop: 0,
      marginBottom: 1.5, // margin-bottom: 1.5em
    },
    'h1': {
      fontSize: 1.75, // font-size: 1.75rem
      lineHeight: 1.25, // line-height: 1.25
      marginTop: 1.5, // margin-top: 1.5em
      marginBottom: 0.5, // margin-bottom: 0.5em
      fontWeight: 600,
    },
    'h2': {
      fontSize: 1.5, // font-size: 1.5rem
      lineHeight: 1.25, // line-height: 1.25
      marginTop: 1.5, // margin-top: 1.5em
      marginBottom: 0.5, // margin-bottom: 0.5em
      fontWeight: 600,
    },
    'h3': {
      fontSize: 1.25, // font-size: 1.25rem
      lineHeight: 1.25, // line-height: 1.25
      marginTop: 1.5, // margin-top: 1.5em
      marginBottom: 0.5, // margin-bottom: 0.5em
      fontWeight: 600,
    },
    'h4': {
      fontSize: 1.125, // font-size: 1.125rem
      lineHeight: 1.25, // line-height: 1.25
      marginTop: 1.5, // margin-top: 1.5em
      marginBottom: 0.5, // margin-bottom: 0.5em
      fontWeight: 600,
    },
    'h5': {
      fontSize: 1, // font-size: 1rem
      lineHeight: 1.25, // line-height: 1.25
      marginTop: 1.5, // margin-top: 1.5em
      marginBottom: 0.5, // margin-bottom: 0.5em
      fontWeight: 600,
    },
    'h6': {
      fontSize: 0.875, // font-size: 0.875rem
      lineHeight: 1.25, // line-height: 1.25
      marginTop: 1.5, // margin-top: 1.5em
      marginBottom: 0.5, // margin-bottom: 0.5em
      fontWeight: 600,
    },
    'blockquote': {
      fontSize: 1,
      lineHeight: 1.75, // matches base
      marginTop: 0,
      marginBottom: 0.5,
    },

    'ul': {
      fontSize: 1,
      lineHeight: 1.75, // matches base
      marginTop: 0,
      marginBottom: 0,
    },

    'ol': {
      fontSize: 1,
      lineHeight: 1.75, // matches base
      marginTop: 0,
      marginBottom: 0,
    },

    'div': {
      fontSize: 1,
      lineHeight: 1.75, // matches base
      marginTop: 0,
      marginBottom: 0,
    },
  },
};

/**
 * Gets the style config for an element, with fallback to default
 */
export function getElementStyle(tagName: string): ElementStyle {
  const tag = tagName.toLowerCase();
  return previewStylesConfig.elements[tag] || previewStylesConfig.elements['div'];
}

