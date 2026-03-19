#!/usr/bin/env node

/**
 * Download thumbnail images from Cloudflare Images and re-upload to R2
 * as print images for legacy projects (2024-2025 and earlier).
 *
 * For each project that has a thumb_image_id but no print_image_path,
 * this script:
 *   1. Fetches the image from Cloudflare Images (xl variant, 2000x2000)
 *   2. Uploads it to R2 under slam/print-images/{yearShort}/{slug}.jpg
 *   3. Updates the project's print_image_path in D1
 *
 * Usage:
 *   node scripts/populate-print-images.mjs --local
 *   node scripts/populate-print-images.mjs --remote
 */

import { spawn } from "child_process";
import { writeFile, unlink, mkdtemp } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { tmpdir } from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");

const CF_IMAGES_BASE =
  "https://imagedelivery.net/7-GLn6-56OyK7JwwGe0hfg/";

function academicYearToShort(academicYear) {
  // "2024-2025" → "24-25"
  const parts = academicYear.split("-");
  if (parts.length === 2) {
    return parts.map((p) => p.slice(-2)).join("-");
  }
  return academicYear;
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: PROJECT_ROOT,
      shell: true,
      ...options,
    });

    let stdout = "";
    let stderr = "";

    if (child.stdout) {
      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });
    }
    if (child.stderr) {
      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });
    }

    child.on("close", (code) => {
      if (code === 0) resolve(stdout.trim());
      else
        reject(
          new Error(
            `Command failed (code ${code}): ${command} ${args.join(" ")}\n${stderr}`
          )
        );
    });
    child.on("error", reject);
  });
}

async function queryD1(sql, isRemote) {
  const target = isRemote ? "--remote" : "--local";
  const result = await runCommand(
    "npx",
    [
      "wrangler",
      "d1",
      "execute",
      "sintlucasmasters",
      target,
      "--json",
      "--command",
      JSON.stringify(sql),
    ],
    { stdio: ["pipe", "pipe", "pipe"] }
  );

  const parsed = JSON.parse(result);
  // wrangler d1 --json returns an array of result objects
  if (Array.isArray(parsed) && parsed.length > 0) {
    return parsed[0].results || [];
  }
  return [];
}

async function executeD1(sql, isRemote) {
  const target = isRemote ? "--remote" : "--local";
  await runCommand(
    "npx",
    [
      "wrangler",
      "d1",
      "execute",
      "sintlucasmasters",
      target,
      "--command",
      JSON.stringify(sql),
    ],
    { stdio: ["pipe", "pipe", "pipe"] }
  );
}

async function main() {
  const args = process.argv.slice(2);
  const isRemote = args.includes("--remote");
  const isLocal = args.includes("--local");

  if (!isRemote && !isLocal) {
    console.error(
      "Usage: node scripts/populate-print-images.mjs --local|--remote"
    );
    process.exit(1);
  }

  const targetLabel = isRemote ? "REMOTE (production)" : "LOCAL";
  console.log(
    `\nPopulating print images on ${targetLabel} database...\n`
  );

  // Find projects without print_image_path, using thumb_image_id or first project_image
  const projects = await queryD1(
    "SELECT p.id, p.student_name, p.academic_year, COALESCE(p.thumb_image_id, pi.cloudflare_id) AS image_id FROM projects p LEFT JOIN project_images pi ON pi.project_id = p.id AND pi.sort_order = 0 WHERE (p.print_image_path IS NULL OR p.print_image_path = '') AND COALESCE(p.thumb_image_id, pi.cloudflare_id) IS NOT NULL ORDER BY p.academic_year, p.student_name",
    isRemote
  );

  if (projects.length === 0) {
    console.log("No projects need print image population.");
    return;
  }

  console.log(`Found ${projects.length} projects needing print images.\n`);

  const tmpDir = await mkdtemp(join(tmpdir(), "print-images-"));
  const target = isRemote ? "--remote" : "--local";
  let succeeded = 0;
  let failed = 0;

  for (const project of projects) {
    const yearShort = academicYearToShort(project.academic_year);
    const slug = slugify(project.student_name);
    const r2Key = `slam/print-images/${yearShort}/${slug}.jpg`;
    const imageUrl = `${CF_IMAGES_BASE}${project.image_id}/xl`;

    try {
      // Download image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} fetching ${imageUrl}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const tmpFile = join(tmpDir, `${slug}.jpg`);
      await writeFile(tmpFile, buffer);

      // Upload to R2
      await runCommand(
        "npx",
        [
          "wrangler",
          "r2",
          "object",
          "put",
          `sintlucasmasters/${r2Key}`,
          `--file=${tmpFile}`,
          `--content-type=image/jpeg`,
          target,
        ],
        { stdio: ["pipe", "pipe", "pipe"] }
      );

      // Update DB
      await executeD1(
        `UPDATE projects SET print_image_path = '${r2Key}' WHERE id = '${project.id}'`,
        isRemote
      );

      console.log(`  OK: ${project.student_name} (${yearShort}) → ${r2Key}`);
      succeeded++;

      // Clean up temp file
      await unlink(tmpFile).catch(() => {});
    } catch (err) {
      console.error(
        `  FAIL: ${project.student_name} (${yearShort}): ${err.message}`
      );
      failed++;
    }
  }

  console.log(`\nDone: ${succeeded} succeeded, ${failed} failed.`);
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
