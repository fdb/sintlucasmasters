#!/usr/bin/env node

/**
 * Rebuild database: drop tables, recreate schema, and import data
 *
 * Usage:
 *   node scripts/db-rebuild.mjs --local   # Rebuild local D1
 *   node scripts/db-rebuild.mjs --remote  # Rebuild production D1
 */

import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

const args = process.argv.slice(2);
const isRemote = args.includes('--remote');
const isLocal = args.includes('--local');

if (!isRemote && !isLocal) {
    console.error('Usage: node scripts/db-rebuild.mjs --local|--remote');
    process.exit(1);
}

const target = isRemote ? '--remote' : '--local';
const targetLabel = isRemote ? 'REMOTE (production)' : 'LOCAL';

function runCommand(command, args) {
    return new Promise((resolve, reject) => {
        console.log(`\n> ${command} ${args.join(' ')}`);
        const child = spawn(command, args, {
            stdio: 'inherit',
            cwd: PROJECT_ROOT,
            shell: true
        });
        child.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Command failed with code ${code}`));
        });
        child.on('error', reject);
    });
}

async function main() {
    console.log(`\n🔄 Rebuilding ${targetLabel} database...\n`);

    // Step 1: Drop tables
    console.log('📦 Step 1: Dropping existing tables...');
    await runCommand('npx', [
        'wrangler', 'd1', 'execute', 'sintlucasmasters', target,
        '--command', '"DROP TABLE IF EXISTS project_images; DROP TABLE IF EXISTS projects;"'
    ]);

    // Step 2: Create schema
    console.log('\n📦 Step 2: Creating schema...');
    await runCommand('npx', [
        'wrangler', 'd1', 'execute', 'sintlucasmasters', target,
        '--file', './schema.sql'
    ]);

    // Step 3: Import data
    console.log('\n📦 Step 3: Importing data...');
    await runCommand('node', ['scripts/import-to-d1.mjs', target]);

    console.log(`\n✅ ${targetLabel} database rebuilt successfully!`);
}

main().catch((err) => {
    console.error('\n❌ Rebuild failed:', err.message);
    process.exit(1);
});
