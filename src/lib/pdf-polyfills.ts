// src/lib/pdf-polyfills.ts
// Polyfill browser APIs for pdf-parse in Node.js environment
// These must be set up before importing pdf-parse

// Ensure polyfills are set up immediately when this module loads
(function setupPolyfills() {
  if (typeof globalThis.DOMMatrix === 'undefined') {
    (globalThis as any).DOMMatrix = class DOMMatrix {
      a = 1;
      b = 0;
      c = 0;
      d = 1;
      e = 0;
      f = 0;
      constructor(init?: string | number[]) {
        // Minimal implementation for pdf-parse
      }
    };
  }

  if (typeof globalThis.ImageData === 'undefined') {
    (globalThis as any).ImageData = class ImageData {
      data: Uint8ClampedArray;
      width: number;
      height: number;
      constructor(dataOrWidth: Uint8ClampedArray | number, widthOrHeight?: number, height?: number) {
        if (dataOrWidth instanceof Uint8ClampedArray) {
          this.data = dataOrWidth;
          this.width = widthOrHeight || 0;
          this.height = height || 0;
        } else {
          this.width = dataOrWidth;
          this.height = widthOrHeight || 0;
          this.data = new Uint8ClampedArray(this.width * this.height * 4);
        }
      }
    };
  }

  if (typeof globalThis.Path2D === 'undefined') {
    (globalThis as any).Path2D = class Path2D {
      // Minimal implementation
    };
  }
})(); // Immediately invoke to set up polyfills

// Configure pdfjs worker for server-side usage
// This must be done before pdf-parse imports pdfjs
export async function configurePdfJsWorker() {
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    if (pdfjs.GlobalWorkerOptions) {
      // For server-side, we need to disable the worker
      // Setting to a non-empty string that won't be used
      pdfjs.GlobalWorkerOptions.workerSrc = 'data:application/javascript,';
    }
  } catch (err) {
    // If pdfjs isn't available yet, that's okay - we'll configure it later
    console.warn('[PDF-POLYFILLS] Could not configure pdfjs worker:', err);
  }
}
