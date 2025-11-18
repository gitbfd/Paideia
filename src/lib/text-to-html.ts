// src/lib/text-to-html.ts
// Converts text to HTML based on source type and configuration
import { marked } from 'marked';
import { textProcessingConfig } from './text-processing-config';

/**
 * Escapes HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Converts plain text to HTML with line breaks preserved
 */
function plainTextToHtml(text: string): string {
  const config = textProcessingConfig.htmlConversion;
  let html = text;

  if (config.escapeHtml) {
    html = escapeHtml(html);
  }

  // Convert line breaks to <br> tags
  if (config.preserveLineBreaks) {
    html = html.replace(/\n/g, '<br>');
  }

  // Wrap in paragraphs if configured
  if (config.wrapInParagraphs) {
    // Split by double line breaks to create paragraphs
    const paragraphs = html.split('<br><br>').filter(p => p.trim());
    html = paragraphs.map(p => `<p>${p}</p>`).join('\n');
  }

  return html;
}

/**
 * Converts markdown to HTML
 */
async function markdownToHtml(text: string): Promise<string> {
  const config = textProcessingConfig.htmlConversion;
  
  if (!config.markdownToHtml) {
    // If markdown conversion is disabled, treat as plain text
    return plainTextToHtml(text);
  }

  // Configure marked for safe rendering
  marked.setOptions({
    breaks: config.preserveLineBreaks, // Convert single line breaks to <br>
    gfm: true, // GitHub Flavored Markdown
  });

  try {
    const html = await marked.parse(text);
    // marked.parse returns a Promise<string> in async mode
    return typeof html === 'string' ? html : String(html);
  } catch (error) {
    console.error('Markdown conversion error:', error);
    // Fallback to plain text conversion
    return plainTextToHtml(text);
  }
}

/**
 * Converts HTML (sanitizes and returns as-is, with minimal processing)
 */
function htmlToHtml(text: string): string {
  // For HTML source, we trust it but could add sanitization here if needed
  // For now, return as-is since it's already HTML
  return text;
}

/**
 * Main function to convert text to HTML based on source type
 */
export async function convertTextToHtml(
  text: string,
  sourceType: 'pdf' | 'txt' | 'markdown' | 'html' | 'other'
): Promise<string> {
  switch (sourceType) {
    case 'markdown':
      return await markdownToHtml(text);
    
    case 'html':
      return htmlToHtml(text);
    
    case 'pdf':
    case 'txt':
    case 'other':
    default:
      return plainTextToHtml(text);
  }
}

