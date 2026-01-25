import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig(() => ({
  root: __dirname,
  plugins: [react()],
  base: "/admin/",
  build: {
    outDir: resolve(__dirname, "../static/admin"),
    emptyOutDir: true,
  },
}));
