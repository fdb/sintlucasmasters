#!/usr/bin/env node

/**
 * Production backup. Two independent halves, since the database changes
 * constantly but the images barely move:
 *
 *   --db      Timestamped D1 dump → backups/db/<UTC-timestamp>.sql
 *             Cheap; keep a long history of these.
 *
 *   --images  Mirror of every image into backups/images/
 *               r2/<key>                 R2 objects (original bytes)
 *               cloudflare-images/<id>   Cloudflare Images originals
 *               manifest.json            Last run's counts + failures
 *             A single refreshed mirror, not per-run snapshots — images
 *             are "largely the same" run to run, so this is incremental:
 *             Cloudflare Images already on disk are skipped (their IDs are
 *             immutable). R2 objects are always re-fetched (small set, and
 *             a print key can be overwritten in place).
 *
 * No flag (npm run backup:remote) runs both.
 *
 * Auth:
 *   - D1 export + R2 download use wrangler's own session (the same login
 *     you deploy with — no extra env needed).
 *   - The Cloudflare Images REST API needs CLOUDFLARE_ACCOUNT_ID and
 *     CLOUDFLARE_API_TOKEN. These live in .dev.vars/.env after
 *     `npm run setup-secrets`.
 *
 * Usage:
 *   npm run backup:db
 *   npm run backup:images
 *   npm run backup:remote
 */

import { spawn } from "node:child_process";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DB_NAME = "sintlucasmasters";
const R2_BUCKET = "sintlucasmasters";
const DOWNLOAD_CONCURRENCY = 6;

// R2 objects not referenced in D1 (static print templates loaded by key).
const EXTRA_R2_KEYS = ["templates/postcard-text-template.idml", "templates/postcard-images-template.idml"];

// process.env wins; .dev.vars (written by setup-secrets) preferred over .env.
dotenv.config({ path: join(PROJECT_ROOT, ".dev.vars") });
dotenv.config({ path: join(PROJECT_ROOT, ".env") });

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

function runCommand(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd: PROJECT_ROOT, shell: true });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => (stdout += d.toString()));
    child.stderr?.on("data", (d) => (stderr += d.toString()));
    child.on("close", (code) => {
      if (code === 0) resolvePromise(stdout.trim());
      else reject(new Error(`${command} ${args.join(" ")} (exit ${code})\n${stderr.trim()}`));
    });
    child.on("error", reject);
  });
}

async function queryD1(sql) {
  const out = await runCommand("npx", [
    "wrangler",
    "d1",
    "execute",
    DB_NAME,
    "--remote",
    "--json",
    "--command",
    JSON.stringify(sql),
  ]);
  const parsed = JSON.parse(out);
  return Array.isArray(parsed) && parsed.length > 0 ? parsed[0].results || [] : [];
}

/** Run `tasks` through `worker`, at most `limit` in flight, collecting failures. */
async function pool(tasks, limit, worker) {
  const failures = [];
  let index = 0;
  let done = 0;
  async function next() {
    while (index < tasks.length) {
      const i = index++;
      try {
        await worker(tasks[i]);
      } catch (err) {
        failures.push({ item: tasks[i], error: err.message });
      }
      done++;
      if (done % 25 === 0 || done === tasks.length) {
        process.stdout.write(`\r  ${done}/${tasks.length}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, next));
  if (tasks.length > 0) process.stdout.write("\n");
  return failures;
}

const EXT_BY_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/svg+xml": "svg",
};

async function listAllCloudflareImages() {
  const images = [];
  let continuationToken = "";
  do {
    const url = new URL(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v2`);
    url.searchParams.set("per_page", "1000");
    if (continuationToken) url.searchParams.set("continuation_token", continuationToken);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${CF_API_TOKEN}` } });
    if (!res.ok) throw new Error(`Images list HTTP ${res.status}: ${await res.text()}`);
    const body = await res.json();
    if (!body.success) throw new Error(`Images list API error: ${JSON.stringify(body.errors)}`);
    images.push(...body.result.images);
    continuationToken = body.result.continuation_token || "";
  } while (continuationToken);
  return images;
}

async function backupDb() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").replace("-000Z", "Z");
  const dbDir = join(PROJECT_ROOT, "backups", "db");
  await mkdir(dbDir, { recursive: true });
  const dbPath = join(dbDir, `${stamp}.sql`);
  console.log("D1: exporting database…");
  await runCommand("npx", ["wrangler", "d1", "export", DB_NAME, "--remote", "--output", dbPath]);
  console.log(`  done → backups/db/${stamp}.sql\n`);
}

async function backupImages() {
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
    console.error(
      "Missing CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN.\n" +
        "These are needed to back up Cloudflare Images. Run `npm run setup-secrets` first."
    );
    process.exit(1);
  }

  const imagesDir = join(PROJECT_ROOT, "backups", "images");
  const r2Dir = join(imagesDir, "r2");
  const cfDir = join(imagesDir, "cloudflare-images");
  await mkdir(cfDir, { recursive: true });

  const startedAt = Date.now();

  // --- R2: keys come from the app's own references (wrangler can't list) ---
  console.log("R2: collecting referenced keys…");
  const rows = await queryD1(
    "SELECT DISTINCT print_image_path AS key FROM projects WHERE print_image_path IS NOT NULL AND print_image_path != ''"
  );
  const r2Keys = [...new Set([...rows.map((r) => r.key), ...EXTRA_R2_KEYS])];
  console.log(`R2: downloading ${r2Keys.length} object(s)…`);
  const r2Failures = await pool(r2Keys, DOWNLOAD_CONCURRENCY, async (key) => {
    const dest = join(r2Dir, key);
    await mkdir(dirname(dest), { recursive: true });
    await runCommand("npx", ["wrangler", "r2", "object", "get", `${R2_BUCKET}/${key}`, "--remote", `--file=${dest}`]);
  });

  // --- Cloudflare Images: skip ones already mirrored (IDs are immutable) ---
  console.log("Cloudflare Images: listing account…");
  const cfImages = await listAllCloudflareImages();
  const onDisk = new Set((await readdir(cfDir)).map((f) => f.slice(0, f.lastIndexOf(".")).replace(/__/g, "/")));
  const toFetch = cfImages.filter((img) => !onDisk.has(img.id));
  console.log(`Cloudflare Images: ${cfImages.length} total, ${toFetch.length} new to download…`);
  const cfFailures = await pool(toFetch, DOWNLOAD_CONCURRENCY, async (img) => {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v1/${img.id}/blob`, {
      headers: { Authorization: `Bearer ${CF_API_TOKEN}` },
    });
    if (!res.ok) throw new Error(`blob HTTP ${res.status} for ${img.id}`);
    const ext = EXT_BY_MIME[res.headers.get("content-type")] || "bin";
    const buf = Buffer.from(await res.arrayBuffer());
    // Image IDs may contain slashes; flatten so they map to single files.
    await writeFile(join(cfDir, `${img.id.replace(/\//g, "__")}.${ext}`), buf);
  });

  const manifest = {
    finishedAt: new Date().toISOString(),
    durationSeconds: Math.round((Date.now() - startedAt) / 1000),
    r2: { total: r2Keys.length, failed: r2Failures.length, failures: r2Failures },
    cloudflareImages: {
      total: cfImages.length,
      downloaded: toFetch.length - cfFailures.length,
      skipped: cfImages.length - toFetch.length,
      failed: cfFailures.length,
      failures: cfFailures.map((f) => ({ id: f.item.id, error: f.error })),
    },
  };
  await writeFile(join(imagesDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  const totalFailed = r2Failures.length + cfFailures.length;
  console.log(
    `\nImages done in ${manifest.durationSeconds}s — ${r2Keys.length} R2, ` +
      `${toFetch.length} new Cloudflare Images (${manifest.cloudflareImages.skipped} skipped)` +
      `${totalFailed ? ` — ${totalFailed} failed, see backups/images/manifest.json` : ""}.`
  );
  return totalFailed;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const wantDb = args.has("--db") || (!args.has("--db") && !args.has("--images"));
  const wantImages = args.has("--images") || (!args.has("--db") && !args.has("--images"));

  let failed = 0;
  if (wantDb) await backupDb();
  if (wantImages) failed = await backupImages();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("\nBackup failed:", err.message);
  process.exit(1);
});
