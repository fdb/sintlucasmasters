#!/usr/bin/env node

/**
 * Re-upload specific Cloudflare Images that have gone missing from production
 * but still exist in the local backup (backups/images/cloudflare-images/**).
 *
 * Restores web images whose `cloudflare_id` is referenced by a project row but
 * returns 404 at imagedelivery.net. Re-uploads from the backup under the SAME
 * custom id, so no DB/code change is needed — pages resolve immediately.
 *
 * Safe by construction:
 *   - Reads creds the same way as backup-remote.mjs (.dev.vars then .env).
 *   - For each id it first GETs images/v1/{id}; if the image already exists it
 *     SKIPS (never clobbers a live image).
 *   - Only touches the ids passed on the command line — no bulk scan.
 *
 * Usage:
 *   node scripts/reupload-missing-images.mjs <cloudflare_id> [<cloudflare_id> ...]
 */

import dotenv from "dotenv";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");
const CF_IMAGES_BACKUP_DIR = join(PROJECT_ROOT, "backups", "images", "cloudflare-images");

dotenv.config({ path: join(PROJECT_ROOT, ".dev.vars") });
dotenv.config({ path: join(PROJECT_ROOT, ".env") });

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CF_ACCOUNT_HASH = process.env.CF_ACCOUNT_HASH || "7-GLn6-56OyK7JwwGe0hfg";

const MIME_BY_EXT = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif" };

async function findBackupFile(id) {
  const prefix = id.replace(/\//g, "__"); // backup flattens slashes; id already has an extension
  const files = await readdir(CF_IMAGES_BACKUP_DIR);
  const match = files.find((f) => f.startsWith(`${prefix}.`));
  return match ? join(CF_IMAGES_BACKUP_DIR, match) : null;
}

async function imageExists(id) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v1/${id}`, {
    headers: { Authorization: `Bearer ${CF_API_TOKEN}` },
  });
  return res.status === 200;
}

async function deliveryStatus(id) {
  const res = await fetch(`https://imagedelivery.net/${CF_ACCOUNT_HASH}/${id}/large`, { method: "GET" });
  return res.status;
}

async function reupload(id) {
  if (await imageExists(id)) {
    console.log(`  SKIP  ${id} — already present in account (not clobbering).`);
    return "skipped";
  }

  const backupFile = await findBackupFile(id);
  if (!backupFile) {
    console.log(`  FAIL  ${id} — no backup file found in ${CF_IMAGES_BACKUP_DIR}.`);
    return "failed";
  }

  const ext = backupFile.slice(backupFile.lastIndexOf(".") + 1).toLowerCase();
  const mime = MIME_BY_EXT[ext] || "application/octet-stream";
  const buf = await readFile(backupFile);

  const form = new FormData();
  form.append("file", new Blob([buf], { type: mime }), id.slice(id.lastIndexOf("/") + 1));
  form.append("id", id);

  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v1`, {
    method: "POST",
    headers: { Authorization: `Bearer ${CF_API_TOKEN}` },
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) {
    console.log(`  FAIL  ${id} — upload HTTP ${res.status}: ${JSON.stringify(body.errors || body)}`);
    return "failed";
  }

  const delivery = await deliveryStatus(id);
  console.log(
    `  OK    ${id} — uploaded ${(buf.length / 1024).toFixed(0)} KB (${mime}); delivery now HTTP ${delivery}.`
  );
  return delivery === 200 ? "ok" : "uploaded-but-unverified";
}

async function main() {
  const ids = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  if (ids.length === 0) {
    console.error("Usage: node scripts/reupload-missing-images.mjs <cloudflare_id> [<cloudflare_id> ...]");
    process.exit(1);
  }
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
    console.error("Missing CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN (set via npm run setup-secrets).");
    process.exit(1);
  }

  console.log(`Re-uploading ${ids.length} image(s) to account ${CF_ACCOUNT_ID}:`);
  const results = {};
  for (const id of ids) {
    const r = await reupload(id);
    results[r] = (results[r] || 0) + 1;
  }
  console.log(`\nDone: ${JSON.stringify(results)}`);
  if (results.failed) process.exit(1);
}

main().catch((err) => {
  console.error("\n❌ Re-upload failed:", err.message);
  process.exit(1);
});
