import path from "node:path";
import { fileURLToPath } from "node:url";
import { promises as fs } from "node:fs";
import fsSync from "node:fs";
import { build, watch } from "rolldown";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const adminDir = path.join(repoRoot, "admin");
const staticAdminDir = path.join(repoRoot, "static", "admin");
const entryFile = path.join(adminDir, "src", "main.tsx");
const htmlTemplate = path.join(adminDir, "index.html");
const outputFile = path.join(staticAdminDir, "index.js");
const outputHtml = path.join(staticAdminDir, "index.html");

const isWatch = process.argv.includes("--watch");

async function ensureOutputDir() {
  await fs.rm(staticAdminDir, { recursive: true, force: true });
  await fs.mkdir(staticAdminDir, { recursive: true });
}

async function copyStaticFiles() {
  await fs.copyFile(htmlTemplate, outputHtml);
}

async function buildOnce() {
  await build({
    input: entryFile,
    output: {
      file: outputFile,
      format: "esm",
      sourcemap: true,
    },
  });
  await copyStaticFiles();
}

async function watchStaticFiles() {
  const watchPaths = [htmlTemplate];
  const watchers = watchPaths.map((filePath) =>
    fsSync.watch(filePath, { persistent: true }, async () => {
      try {
        await copyStaticFiles();
      } catch (error) {
        console.error("Failed to copy admin static files:", error);
      }
    })
  );

  return () => {
    for (const watcher of watchers) {
      watcher.close();
    }
  };
}

async function run() {
  if (!isWatch) {
    await ensureOutputDir();
    await buildOnce();
    return;
  }

  await ensureOutputDir();
  await buildOnce();
  const closeStaticWatchers = await watchStaticFiles();

  const watcher = watch({
    input: entryFile,
    output: {
      file: outputFile,
      format: "esm",
      sourcemap: true,
    },
  });

  watcher.on("event", async (event) => {
    if (event.code === "ERROR") {
      console.error("Rolldown watch error:", event.error);
      return;
    }

    if (event.code === "BUNDLE_END") {
      await copyStaticFiles();
    }
  });

  const shutdown = async () => {
    closeStaticWatchers();
    await watcher.close();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

run().catch((error) => {
  console.error("Admin build failed:", error);
  process.exitCode = 1;
});
