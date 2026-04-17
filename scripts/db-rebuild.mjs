#!/usr/bin/env node

/**
 * Rebuild database: drop tables, recreate schema, and import data
 *
 * Usage:
 *   node scripts/db-rebuild.mjs --local                  # Rebuild local D1 (no R2 uploads)
 *   node scripts/db-rebuild.mjs --local --upload-images  # Rebuild + re-upload images/templates to R2
 *   node scripts/db-rebuild.mjs --remote                 # Rebuild production D1
 */

import { spawn } from "child_process";
import { readdir } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");

const args = process.argv.slice(2);
const isRemote = args.includes("--remote");
const isLocal = args.includes("--local");
const uploadImages = args.includes("--upload-images");

if (!isRemote && !isLocal) {
  console.error("Usage: node scripts/db-rebuild.mjs --local|--remote [--upload-images]");
  process.exit(1);
}

const target = isRemote ? "--remote" : "--local";
const targetLabel = isRemote ? "REMOTE (production)" : "LOCAL";

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`\n> ${command} ${args.join(" ")}`);
    const child = spawn(command, args, {
      stdio: "inherit",
      cwd: PROJECT_ROOT,
      shell: true,
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed with code ${code}`));
    });
    child.on("error", reject);
  });
}

async function main() {
  console.log(`\n🔄 Rebuilding ${targetLabel} database...\n`);

  // Step 1: Drop tables (including migration tracking table so migrations re-run from scratch)
  console.log("📦 Step 1: Dropping existing tables...");
  await runCommand("npx", [
    "wrangler",
    "d1",
    "execute",
    "sintlucasmasters",
    target,
    "--command",
    '"DROP TABLE IF EXISTS project_images; DROP TABLE IF EXISTS projects; DROP TABLE IF EXISTS auth_tokens; DROP TABLE IF EXISTS users; DROP TABLE IF EXISTS d1_migrations;"',
  ]);

  // Step 2: Apply migrations
  console.log("\n📦 Step 2: Applying migrations...");
  await runCommand("npx", ["wrangler", "d1", "migrations", "apply", "sintlucasmasters", target]);

  // Step 3: Import data
  console.log("\n📦 Step 3: Importing data...");
  await runCommand("node", ["scripts/import-to-d1.mjs", target]);

  if (uploadImages) {
    // Step 4: Populate print images from Cloudflare Images → R2
    console.log("\n📦 Step 4: Populating print images...");
    await runCommand("node", ["scripts/populate-print-images.mjs", target]);

    // Step 5: Upload IDML templates to R2
    console.log("\n📦 Step 5: Uploading IDML templates to R2...");
    const templatesDir = join(PROJECT_ROOT, "templates");
    const templateFiles = (await readdir(templatesDir)).filter((f) => f.endsWith(".idml"));
    for (const file of templateFiles) {
      await runCommand("npx", [
        "wrangler",
        "r2",
        "object",
        "put",
        `sintlucasmasters/templates/${file}`,
        `--file=templates/${file}`,
        "--content-type=application/octet-stream",
        target,
      ]);
    }
  } else {
    console.log("\n⏭️  Skipping R2 uploads (use --upload-images to upload print images and templates)");
  }

  console.log(`\n✅ ${targetLabel} database rebuilt successfully!`);
}

main().catch((err) => {
  console.error("\n❌ Rebuild failed:", err.message);
  process.exit(1);
});
