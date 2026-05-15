#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

const localDevVars = {
  APP_BASE_URL: "http://localhost:8787",
  DEV_ADMIN_EMAIL: "dev-admin@sintlucasmasters.local",
  JWT_SECRET: "local-dev-only-jwt-secret",
  SES_CONFIGURATION_SET: "sintlucasmasters-events",
  FAKE_TRANSLATION: "true",
};

const lines = Object.entries(localDevVars).map(([key, value]) => `${key}=${value}`);

await writeFile(resolve(projectRoot, ".dev.vars"), `${lines.join("\n")}\n`, "utf8");
console.log("Wrote .dev.vars with local-only development values.");
