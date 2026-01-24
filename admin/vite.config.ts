import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig(({ command }) => ({
  root: __dirname,
  plugins: [react()],
  base: command === "serve" ? "/" : "/admin/",
  build: {
    outDir: resolve(__dirname, "../static/admin"),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/": "http://localhost:8787",
      "/api": "http://localhost:8787",
      "/auth": "http://localhost:8787",
      "/styles.css": "http://localhost:8787",
      "/admin.css": "http://localhost:8787",
      "/logo-white.svg": "http://localhost:8787",
    },
  },
}));
