// Post-deploy verification: poll /api/health until the deployed version
// matches the commit we just built, then smoke-test the public site.
// Exits non-zero on failure so CI marks the deploy red.
import { execSync } from "node:child_process";

const HEALTH_URL = "https://sintlucasmasters.com/api/health";
const SMOKE_URL = "https://sintlucasmasters.com/nl/";
const ATTEMPTS = 12;
const DELAY_MS = 5000;

const expectedSha = process.env.WORKERS_CI_COMMIT_SHA || execSync("git rev-parse HEAD").toString().trim();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let lastSeen = null;
for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
  try {
    const res = await fetch(HEALTH_URL);
    const body = await res.json();
    lastSeen = body;
    if (res.ok && body.status === "ok" && body.version === expectedSha) {
      console.log(`Health OK: version ${body.version} is live (attempt ${attempt}).`);
      const smoke = await fetch(SMOKE_URL);
      if (smoke.status !== 200) {
        console.error(`Smoke test failed: ${SMOKE_URL} returned ${smoke.status}.`);
        process.exit(1);
      }
      console.log(`Smoke test OK: ${SMOKE_URL} returned 200.`);
      process.exit(0);
    }
  } catch (e) {
    lastSeen = { error: String(e) };
  }
  console.log(`Attempt ${attempt}/${ATTEMPTS}: not live yet (${JSON.stringify(lastSeen)}).`);
  await sleep(DELAY_MS);
}

console.error(
  `Deploy verification failed: expected version ${expectedSha}, last response: ${JSON.stringify(lastSeen)}.`
);
process.exit(1);
