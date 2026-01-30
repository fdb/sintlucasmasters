#!/usr/bin/env node

/**
 * Generate A6 postcard templates with bleed marks
 * No external dependencies - uses only built-in Node.js modules
 *
 * A6 size: 105 × 148mm
 * Bleed: 3mm on each side
 * Total with bleed: 111 × 154mm (portrait) or 154 × 111mm (landscape)
 *
 * Output: PNG and PDF files in templates/ folder
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import zlib from "zlib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.join(__dirname, "..", "templates");

// Dimensions in mm
const A6_WIDTH = 105;
const A6_HEIGHT = 148;
const BLEED = 3;

// Total dimensions with bleed
const TOTAL_WIDTH_PORTRAIT = A6_WIDTH + BLEED * 2; // 111mm
const TOTAL_HEIGHT_PORTRAIT = A6_HEIGHT + BLEED * 2; // 154mm

// DPI for print quality
const DPI = 300;

// Convert mm to pixels at 300 DPI
function mmToPixels(mm) {
  return Math.round((mm / 25.4) * DPI);
}

// Convert mm to PDF points (72 points per inch)
function mmToPoints(mm) {
  return (mm / 25.4) * 72;
}

// CRC32 lookup table for PNG chunk checksums
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    table[n] = c;
  }
  return table;
})();

function crc32(data) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createPNGChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const crcData = Buffer.concat([typeBytes, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);

  return Buffer.concat([length, typeBytes, data, crc]);
}

function generatePNG(width, height, bleed, filename) {
  const pixelWidth = mmToPixels(width);
  const pixelHeight = mmToPixels(height);
  const bleedPixels = mmToPixels(bleed);

  console.log(`  PNG dimensions: ${pixelWidth} × ${pixelHeight} pixels`);

  // PNG signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk (image header)
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(pixelWidth, 0);
  ihdr.writeUInt32BE(pixelHeight, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(2, 9); // color type (RGB)
  ihdr.writeUInt8(0, 10); // compression method (deflate)
  ihdr.writeUInt8(0, 11); // filter method
  ihdr.writeUInt8(0, 12); // interlace method (none)
  const ihdrChunk = createPNGChunk("IHDR", ihdr);

  // Create raw pixel data with filter byte per row
  // White background with 1px red border at content boundary
  const rowSize = 1 + pixelWidth * 3; // filter byte + RGB pixels
  const rawData = Buffer.alloc(rowSize * pixelHeight);

  const innerLeft = bleedPixels;
  const innerRight = pixelWidth - bleedPixels - 1;
  const innerTop = bleedPixels;
  const innerBottom = pixelHeight - bleedPixels - 1;

  for (let y = 0; y < pixelHeight; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // filter type: none

    for (let x = 0; x < pixelWidth; x++) {
      const pixelOffset = rowOffset + 1 + x * 3;

      // Check if pixel is on the 1px red border
      const isOnBorder =
        ((y === innerTop || y === innerBottom) && x >= innerLeft && x <= innerRight) ||
        ((x === innerLeft || x === innerRight) && y >= innerTop && y <= innerBottom);

      if (isOnBorder) {
        // Red (#ff0000)
        rawData[pixelOffset] = 255;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
      } else {
        // White (#ffffff)
        rawData[pixelOffset] = 255;
        rawData[pixelOffset + 1] = 255;
        rawData[pixelOffset + 2] = 255;
      }
    }
  }

  // Compress with zlib deflate (required by PNG spec)
  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = createPNGChunk("IDAT", compressed);

  // pHYs chunk (physical pixel dimensions) - embeds DPI metadata
  // 300 DPI = 300 / 0.0254 = 11811 pixels per meter
  const pixelsPerMeter = Math.round(DPI / 0.0254);
  const phys = Buffer.alloc(9);
  phys.writeUInt32BE(pixelsPerMeter, 0); // X pixels per unit
  phys.writeUInt32BE(pixelsPerMeter, 4); // Y pixels per unit
  phys.writeUInt8(1, 8); // Unit: 1 = meter
  const physChunk = createPNGChunk("pHYs", phys);

  // IEND chunk (end marker)
  const iendChunk = createPNGChunk("IEND", Buffer.alloc(0));

  // Combine all parts
  const png = Buffer.concat([signature, ihdrChunk, physChunk, idatChunk, iendChunk]);

  fs.writeFileSync(path.join(templatesDir, filename), png);
  console.log(`  Created: ${filename} (${(png.length / 1024).toFixed(1)} KB)`);
}

function generatePDF(width, height, bleed, filename) {
  const pointWidth = mmToPoints(width);
  const pointHeight = mmToPoints(height);
  const bleedPoints = mmToPoints(bleed);

  // Content area coordinates
  const x1 = bleedPoints;
  const y1 = bleedPoints;
  const rectWidth = pointWidth - bleedPoints * 2;
  const rectHeight = pointHeight - bleedPoints * 2;

  // Build PDF objects (uncompressed)
  const objects = [];

  // Object 1: Catalog
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");

  // Object 2: Pages
  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj");

  // Object 3: Page
  objects.push(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pointWidth.toFixed(2)} ${pointHeight.toFixed(2)}] /Contents 4 0 R /Resources << >> >>\nendobj`
  );

  // Object 4: Content stream (drawing commands, uncompressed)
  // PDF graphics operators:
  // q/Q = save/restore graphics state
  // rg = set fill color (RGB)
  // RG = set stroke color (RGB)
  // re = rectangle (x, y, width, height)
  // f = fill path
  // S = stroke path
  // w = line width
  const contentStream = [
    "q",
    "1 1 1 rg", // white fill
    `0 0 ${pointWidth.toFixed(2)} ${pointHeight.toFixed(2)} re`,
    "f",
    "Q",
    "q",
    "1 0 0 RG", // red stroke
    "0.5 w", // 0.5pt line width
    `${x1.toFixed(2)} ${y1.toFixed(2)} ${rectWidth.toFixed(2)} ${rectHeight.toFixed(2)} re`,
    "S",
    "Q",
  ].join("\n");

  objects.push(`4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj`);

  // Build the PDF file
  let pdf = "%PDF-1.4\n";
  const offsets = [];

  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj + "\n";
  }

  // Cross-reference table
  const xrefOffset = pdf.length;
  pdf += "xref\n";
  pdf += `0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const offset of offsets) {
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  }

  // Trailer
  pdf += "trailer\n";
  pdf += `<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += "startxref\n";
  pdf += `${xrefOffset}\n`;
  pdf += "%%EOF\n";

  fs.writeFileSync(path.join(templatesDir, filename), pdf);
  console.log(`  Created: ${filename} (${pdf.length} bytes)`);
}

async function main() {
  // Create templates directory if it doesn't exist
  if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir, { recursive: true });
  }

  console.log("Generating A6 postcard templates (no external dependencies)\n");
  console.log(`A6 size: ${A6_WIDTH} × ${A6_HEIGHT}mm`);
  console.log(`Bleed: ${BLEED}mm`);
  console.log(`Total with bleed: ${TOTAL_WIDTH_PORTRAIT} × ${TOTAL_HEIGHT_PORTRAIT}mm (portrait)`);
  console.log(`PNG resolution: ${DPI} DPI\n`);

  // Portrait
  console.log("Portrait:");
  generatePNG(TOTAL_WIDTH_PORTRAIT, TOTAL_HEIGHT_PORTRAIT, BLEED, "postcard-a6-portrait.png");
  generatePDF(TOTAL_WIDTH_PORTRAIT, TOTAL_HEIGHT_PORTRAIT, BLEED, "postcard-a6-portrait.pdf");

  // Landscape (swap dimensions)
  console.log("\nLandscape:");
  generatePNG(TOTAL_HEIGHT_PORTRAIT, TOTAL_WIDTH_PORTRAIT, BLEED, "postcard-a6-landscape.png");
  generatePDF(TOTAL_HEIGHT_PORTRAIT, TOTAL_WIDTH_PORTRAIT, BLEED, "postcard-a6-landscape.pdf");

  console.log("\nDone! Templates saved to templates/ folder.");
}

main().catch(console.error);
