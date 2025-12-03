// src/lib/ingest/pdf/extractor.ts
// PDF text extraction using pdf2json

export async function extractPdfText(fileData: Blob): Promise<string> {
  // Use pdf2json for server-side PDF parsing (no worker required)
  const { createRequire } = await import('module');
  const require = createRequire(import.meta.url);
  const PDFParser = require('pdf2json');
  
  // Convert Blob to Buffer
  const arrayBuffer = await fileData.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  try {
    // Create parser instance (no arguments needed for basic usage)
    const pdfParser = new PDFParser();
    
    // Parse PDF using promise-based API
    const pdfData = await new Promise<any>((resolve, reject) => {
      pdfParser.on('pdfParser_dataError', (err: any) => {
        reject(new Error(`PDF parsing error: ${err.parserError || err.message || 'Unknown error'}`));
      });
      
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        resolve(pdfData);
      });
      
      // Parse PDF buffer - pdf2json's parseBuffer accepts Buffer directly
      pdfParser.parseBuffer(buffer);
    });
    
    // Extract text from all pages
    const textParts: string[] = [];
    if (pdfData.Pages && Array.isArray(pdfData.Pages)) {
      for (const page of pdfData.Pages) {
        if (page.Texts && Array.isArray(page.Texts)) {
          for (const textItem of page.Texts) {
            if (textItem.R && Array.isArray(textItem.R)) {
              for (const run of textItem.R) {
                if (run.T) {
                  // Decode URI component if needed (pdf2json encodes text)
                  try {
                    textParts.push(decodeURIComponent(run.T));
                  } catch {
                    textParts.push(run.T);
                  }
                }
              }
            }
          }
        }
      }
    }
    
    const raw = textParts.join(' ');
    
    if (!raw || raw.trim().length === 0) {
      throw new Error('No text could be extracted from PDF');
    }
    
    return raw;
  } catch (parseErr: any) {
    console.error('[INGEST] PDF parsing failed:', parseErr);
    throw new Error(`PDF text extraction failed: ${parseErr.message}`);
  }
}

