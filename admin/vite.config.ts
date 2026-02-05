import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { resolve } from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: resolve(__dirname, "../.env") });

const isWatchMode = process.argv.includes("--watch");
const enableSentry = !!process.env.SENTRY_AUTH_TOKEN && !isWatchMode;

export default defineConfig(() => ({
  root: __dirname,
  plugins: [
    react(),
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      sourcemaps: { filesToDeleteAfterUpload: ["**/*.map"] },
      silent: !enableSentry,
      disable: !enableSentry,
    }),
  ],
  base: "/admin/",
  build: {
    outDir: resolve(__dirname, "../static/admin"),
    emptyOutDir: true,
    sourcemap: true,
  },
}));
