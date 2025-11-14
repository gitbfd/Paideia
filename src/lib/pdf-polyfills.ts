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
