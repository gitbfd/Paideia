// src/lib/ingest/types.ts
// Type definitions for document ingestion

export type SourceType = 'pdf' | 'txt' | 'markdown' | 'html' | 'other';

export interface ExtractedContent {
  raw: string;
  textForDisplay: string;
  textForRag: string;
}

export interface IngestOptions {
  chunkSize?: number;
  overlap?: number;
}

export interface IngestResult {
  success: boolean;
  chunks: number;
}

