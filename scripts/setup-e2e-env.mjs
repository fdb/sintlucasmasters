/**
 * Generates a .dev.vars file with dummy values for E2E testing.
 * Skips writing if .dev.vars already exists (preserves real secrets for developers).
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFile, access } from "node:fs/promises";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const devVarsPath = resolve(projectRoot, ".dev.vars");

try {
  await access(devVarsPath);
  console.log(".dev.vars already exists, skipping dummy generation.");
  process.exit(0);
} catch {
  // File doesn't exist — generate dummy values
}

const dummyVars = `RESEND_API_KEY=re_dummy
ENCRYPTION_KEY=e2e-encryption-key-placeholder-0123456789ab
JWT_SECRET=e2e-jwt-secret-placeholder
AWS_ACCESS_KEY_ID=AKIADUMMY
AWS_SECRET_ACCESS_KEY=dummy-secret
AWS_REGION=eu-west-1
CLOUDFLARE_ACCOUNT_ID=dummy-account-id
CLOUDFLARE_API_TOKEN=dummy-api-token
ANTHROPIC_API_KEY=sk-ant-dummy
`;

await writeFile(devVarsPath, dummyVars, "utf8");
console.log("Wrote .dev.vars with dummy values for E2E testing.");
