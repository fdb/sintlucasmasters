/**
 * Extract width and height from PNG or JPEG image binary data.
 * Works in Cloudflare Workers (no native image libraries needed).
 */
export function getImageDimensions(buffer: ArrayBuffer): { width: number; height: number } | null {
  const view = new DataView(buffer);

  // PNG: first 8 bytes are signature, then IHDR chunk has width at offset 16, height at 20
  if (buffer.byteLength >= 24 && view.getUint8(0) === 0x89 && view.getUint8(1) === 0x50) {
    const width = view.getUint32(16, false);
    const height = view.getUint32(20, false);
    return { width, height };
  }

  // JPEG: starts with FF D8, scan for SOF markers (FF C0, FF C1, FF C2)
  if (buffer.byteLength >= 2 && view.getUint8(0) === 0xff && view.getUint8(1) === 0xd8) {
    let offset = 2;
    while (offset + 4 < buffer.byteLength) {
      if (view.getUint8(offset) !== 0xff) {
        offset++;
        continue;
      }
      const marker = view.getUint8(offset + 1);
      // SOF0, SOF1, SOF2 markers contain dimensions
      if (marker >= 0xc0 && marker <= 0xc2) {
        if (offset + 9 < buffer.byteLength) {
          const height = view.getUint16(offset + 5, false);
          const width = view.getUint16(offset + 7, false);
          return { width, height };
        }
      }
      // Skip to next marker using segment length
      if (offset + 3 < buffer.byteLength) {
        const segmentLength = view.getUint16(offset + 2, false);
        offset += 2 + segmentLength;
      } else {
        break;
      }
    }
  }

  return null;
}
