#!/usr/bin/env node

/**
 * Generate A6 postcard templates with bleed marks
 *
 * A6 size: 105 × 148mm
 * Bleed: 3mm on each side
 * Total with bleed: 111 × 154mm (portrait) or 154 × 111mm (landscape)
 *
 * Output: PNG and PDF files in templates/ folder
 */

import { createCanvas } from "canvas";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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

function generatePNG(width, height, bleed, filename) {
  const pixelWidth = mmToPixels(width);
  const pixelHeight = mmToPixels(height);
  const bleedPixels = mmToPixels(bleed);

  const canvas = createCanvas(pixelWidth, pixelHeight);
  const ctx = canvas.getContext("2d");

  // Fill with white background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, pixelWidth, pixelHeight);

  // Draw red line at content boundary (1px)
  ctx.strokeStyle = "#ff0000";
  ctx.lineWidth = 1;
  ctx.strokeRect(bleedPixels, bleedPixels, pixelWidth - bleedPixels * 2, pixelHeight - bleedPixels * 2);

  // Save PNG
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(path.join(templatesDir, filename), buffer);
  console.log(`Created: ${filename}`);
}

function generatePDF(width, height, bleed, filename) {
  const pointWidth = mmToPoints(width);
  const pointHeight = mmToPoints(height);
  const bleedPoints = mmToPoints(bleed);

  const doc = new PDFDocument({
    size: [pointWidth, pointHeight],
    margin: 0,
  });

  const stream = fs.createWriteStream(path.join(templatesDir, filename));
  doc.pipe(stream);

  // Fill with white background
  doc.rect(0, 0, pointWidth, pointHeight).fill("#ffffff");

  // Draw red line at content boundary (0.5pt = thin line)
  doc
    .rect(bleedPoints, bleedPoints, pointWidth - bleedPoints * 2, pointHeight - bleedPoints * 2)
    .lineWidth(0.5)
    .stroke("#ff0000");

  doc.end();

  return new Promise((resolve) => {
    stream.on("finish", () => {
      console.log(`Created: ${filename}`);
      resolve();
    });
  });
}

async function main() {
  // Create templates directory if it doesn't exist
  if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir, { recursive: true });
  }

  console.log("Generating A6 postcard templates...\n");
  console.log(`A6 size: ${A6_WIDTH} × ${A6_HEIGHT}mm`);
  console.log(`Bleed: ${BLEED}mm`);
  console.log(`Total with bleed: ${TOTAL_WIDTH_PORTRAIT} × ${TOTAL_HEIGHT_PORTRAIT}mm (portrait)`);
  console.log(`PNG resolution: ${DPI} DPI\n`);

  // Portrait
  generatePNG(TOTAL_WIDTH_PORTRAIT, TOTAL_HEIGHT_PORTRAIT, BLEED, "postcard-a6-portrait.png");
  await generatePDF(TOTAL_WIDTH_PORTRAIT, TOTAL_HEIGHT_PORTRAIT, BLEED, "postcard-a6-portrait.pdf");

  // Landscape (swap dimensions)
  generatePNG(TOTAL_HEIGHT_PORTRAIT, TOTAL_WIDTH_PORTRAIT, BLEED, "postcard-a6-landscape.png");
  await generatePDF(TOTAL_HEIGHT_PORTRAIT, TOTAL_WIDTH_PORTRAIT, BLEED, "postcard-a6-landscape.pdf");

  console.log("\nDone! Templates saved to templates/ folder.");
}

main().catch(console.error);
