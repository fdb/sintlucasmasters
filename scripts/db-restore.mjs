#!/usr/bin/env node

/**
 * Restore a production D1 backup into the LOCAL dev database.
 *
 * Backups are full `wrangler d1 export` dumps (see backup-remote.mjs):
 * PRAGMA + CREATE TABLE/INDEX + INSERTs, including the d1_migrations
 * ledger. So restoring is just: drop existing tables, replay the file.
 * No migrations re-run — the dump already carries the post-migration
 * schema and migration history.
 *
 * Why sqlite3 instead of `wrangler d1 execute --file`:
 *   `wrangler d1 export` orders tables by creation order, not FK
 *   dependency order (projects.user_id REFERENCES users, but projects'
 *   rows are inserted before the users table is created). The dump's
 *   `PRAGMA defer_foreign_keys=TRUE` covers this on --remote, but
 *   wrangler's local --file executor doesn't preserve it across
 *   statements. The sqlite3 CLI defaults to foreign_keys=OFF, which is
 *   exactly the semantics a bulk restore wants.
 *
 * Also mirrors the matching R2 image backup (backups/images/r2/**, the
 * other half of a `backup-remote.mjs` run) into the LOCAL R2 bucket, so
 * InDesign image/print exports work against the restored data. Skipped
 * with a warning if no image backup is present.
 *
 * Local only by design. Overwriting production from a backup is a
 * deliberate, dangerous operation and is intentionally not supported here.
 *
 * Usage:
 *   node scripts/db-restore.mjs                       # newest backup in backups/db/
 *   node scripts/db-restore.mjs path/to/backup.sql    # a specific dump
 */

import { spawn } from "node:child_process";
import { glob, readFile, readdir, rm } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");
const BACKUP_DIR = join(PROJECT_ROOT, "backups", "db");
const R2_BACKUP_DIR = join(PROJECT_ROOT, "backups", "images", "r2");
const D1_DIR = join(PROJECT_ROOT, ".wrangler", "state", "v3", "d1", "miniflare-D1DatabaseObject");

async function latestBackup() {
  let files;
  try {
    files = (await readdir(BACKUP_DIR)).filter((f) => f.endsWith(".sql")).sort();
  } catch {
    throw new Error(
      `No backups dir at ${BACKUP_DIR}. Pass an explicit path: npm run db:restore -- /path/to/backup.sql`
    );
  }
  if (files.length === 0) throw new Error(`No .sql backups found in ${BACKUP_DIR}`);
  return join(BACKUP_DIR, files[files.length - 1]); // ISO timestamps sort chronologically
}

async function findLocalDb() {
  const files = [];
  for await (const f of glob("*.sqlite", { cwd: D1_DIR })) files.push(join(D1_DIR, f));
  if (files.length === 0) {
    throw new Error(
      `No local D1 database found under ${D1_DIR}.\nRun \`npm run init\` (or start \`npm run dev\` once) first.`
    );
  }
  if (files.length > 1) {
    throw new Error(`Expected one local D1 file, found ${files.length}:\n${files.join("\n")}`);
  }
  return files[0];
}

function runSqlite(dbFile, sql) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn("sqlite3", ["-bail", dbFile], { stdio: ["pipe", "inherit", "inherit"], cwd: PROJECT_ROOT });
    child.on("close", (code) =>
      code === 0 ? resolvePromise() : reject(new Error(`sqlite3 exited with code ${code}`))
    );
    child.on("error", reject);
    child.stdin.end(sql);
  });
}

function runWrangler(wranglerArgs) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn("npx", ["wrangler", ...wranglerArgs], {
      stdio: ["ignore", "ignore", "inherit"],
      cwd: PROJECT_ROOT,
    });
    child.on("close", (code) =>
      code === 0 ? resolvePromise() : reject(new Error(`wrangler ${wranglerArgs.join(" ")} exited ${code}`))
    );
    child.on("error", reject);
  });
}

// Mirror backups/images/r2/** into local R2. The on-disk path minus the
// R2_BACKUP_DIR prefix IS the original R2 key (wrangler r2 object get
// reconstructs keys as a directory tree on download).
async function restoreR2() {
  let entries;
  try {
    entries = await readdir(R2_BACKUP_DIR, { recursive: true, withFileTypes: true });
  } catch {
    console.warn(
      `\n⚠️  No R2 image backup at ${R2_BACKUP_DIR} — skipping R2 restore.\n` +
        `   InDesign image/print exports will 404 locally until you run \`npm run backup:images\`.`
    );
    return;
  }
  const files = entries.filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name));
  if (files.length === 0) {
    console.warn(`\n⚠️  ${R2_BACKUP_DIR} is empty — skipping R2 restore.`);
    return;
  }
  console.log(`\nRestoring ${files.length} R2 object(s) into local R2…`);
  for (const f of files) {
    const key = relative(R2_BACKUP_DIR, f).split(/[\\/]/).join("/");
    await runWrangler(["r2", "object", "put", `sintlucasmasters/${key}`, `--file=${f}`, "--local"]);
  }
  console.log(`  ${files.length} object(s) restored.`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--remote")) {
    console.error("Refusing --remote: this script only restores the LOCAL dev database.");
    process.exit(1);
  }

  const argPath = args.find((a) => !a.startsWith("-"));
  const sqlFile = argPath ? (isAbsolute(argPath) ? argPath : resolve(process.cwd(), argPath)) : await latestBackup();

  const dump = await readFile(sqlFile, "utf-8");
  const tables = [...dump.matchAll(/CREATE TABLE\s+"?([A-Za-z0-9_]+)"?/g)].map((m) => m[1]);
  if (tables.length === 0) {
    throw new Error(`No CREATE TABLE statements in ${sqlFile} — is this a wrangler d1 export dump?`);
  }

  const dbFile = await findLocalDb();

  console.log(`Restoring LOCAL D1 (${dbFile})`);
  console.log(`  from: ${sqlFile}`);
  console.log(`  tables: ${tables.join(", ")}`);

  // Stale WAL/SHM from a previous miniflare session would replay over the
  // restored pages on the next open — clear them since we're wiping data.
  await rm(`${dbFile}-wal`, { force: true });
  await rm(`${dbFile}-shm`, { force: true });

  const dropSql = tables.map((t) => `DROP TABLE IF EXISTS "${t}";`).join("\n");
  await runSqlite(dbFile, `PRAGMA foreign_keys=OFF;\n${dropSql}\n${dump}`);

  await restoreR2();

  console.log(
    `\n✅ Local database restored from ${argPath ?? "latest backup"}. Restart the dev server if it's running.`
  );
}

main().catch((err) => {
  console.error("\n❌ Restore failed:", err.message);
  process.exit(1);
});
