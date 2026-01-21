import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import dotenv from 'dotenv';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const envPath = resolve(projectRoot, '.env');
dotenv.config({ path: envPath });

const requiredKeys = ['RESEND_API_KEY', 'ENCRYPTION_KEY', 'JWT_SECRET', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'];
const optionalKeysLocal = ['APP_BASE_URL', 'SES_CONFIGURATION_SET'];
const optionalKeysRemote = ['SES_CONFIGURATION_SET'];

const missing = requiredKeys.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing required env vars: ${missing.join(', ')}. Add them to .env first.`);
  process.exit(1);
}

const escapeValue = (value) => {
  if (!value) return '';
  if (/[\s#"'`]/.test(value)) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  return value;
};

const runWranglerSecretPut = (key, value) =>
  new Promise((resolvePromise, reject) => {
    const child = spawn('wrangler', ['secret', 'put', key], {
      stdio: ['pipe', 'inherit', 'inherit'],
    });
    child.stdin.write(`${value}\n`);
    child.stdin.end();
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(new Error(`wrangler secret put ${key} failed with code ${code}`));
      }
    });
  });

const args = new Set(process.argv.slice(2));
const runLocal = args.has('--local') || (!args.has('--remote') && !args.has('--local'));
const runRemote = args.has('--remote');

if (runLocal) {
  const lines = [
    ...requiredKeys.map((key) => `${key}=${escapeValue(process.env[key])}`),
    ...optionalKeysLocal.filter((key) => process.env[key]).map((key) => `${key}=${escapeValue(process.env[key])}`),
  ];
  await writeFile(resolve(projectRoot, '.dev.vars'), `${lines.join('\n')}\n`, 'utf8');
  console.log('Wrote .dev.vars for local development.');
}

if (runRemote) {
  for (const key of requiredKeys) {
    await runWranglerSecretPut(key, process.env[key]);
  }
  for (const key of optionalKeysRemote) {
    if (process.env[key]) {
      await runWranglerSecretPut(key, process.env[key]);
    }
  }
  console.log('Uploaded secrets to Cloudflare.');
}
