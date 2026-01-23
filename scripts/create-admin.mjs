#!/usr/bin/env node

/**
 * Create an admin user in the database
 *
 * Usage:
 *   node scripts/create-admin.mjs --local <email>   # Create admin in local D1
 *   node scripts/create-admin.mjs --remote <email>  # Create admin in production D1
 */

import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

/**
 * Generate deterministic user ID from email
 */
function generateUserId(email) {
	const hash = createHash('sha256').update(email.toLowerCase()).digest('hex');
	return hash.substring(0, 32);
}

/**
 * Run wrangler d1 execute with a command
 */
function runWrangler(command, isRemote) {
	return new Promise((resolve, reject) => {
		const args = ['d1', 'execute', 'sintlucasmasters', isRemote ? '--remote' : '--local', '--command', command];
		console.log(`Running: wrangler ${args.join(' ')}\n`);

		const child = spawn('npx', ['wrangler', ...args], {
			stdio: 'inherit',
			cwd: PROJECT_ROOT,
		});

		child.on('close', (code) => {
			if (code === 0) {
				resolve();
			} else {
				reject(new Error(`wrangler exited with code ${code}`));
			}
		});

		child.on('error', reject);
	});
}

async function main() {
	const args = process.argv.slice(2);
	const isRemote = args.includes('--remote');
	const isLocal = args.includes('--local');

	// Get email from args (excluding flags)
	const email = args.find((arg) => !arg.startsWith('--'));

	if (!isRemote && !isLocal) {
		console.error('Usage: node scripts/create-admin.mjs --local|--remote <email>');
		console.error('');
		console.error('Examples:');
		console.error('  node scripts/create-admin.mjs --local admin@example.com');
		console.error('  node scripts/create-admin.mjs --remote admin@example.com');
		process.exit(1);
	}

	if (!email || !email.includes('@')) {
		console.error('Error: Valid email address is required');
		console.error('');
		console.error('Usage: node scripts/create-admin.mjs --local|--remote <email>');
		process.exit(1);
	}

	const normalizedEmail = email.toLowerCase().trim();
	const userId = generateUserId(normalizedEmail);

	console.log(`Creating admin user in ${isRemote ? 'REMOTE (production)' : 'LOCAL'} database...`);
	console.log(`  Email: ${normalizedEmail}`);
	console.log(`  User ID: ${userId}`);
	console.log('');

	// Use INSERT OR REPLACE to make it idempotent
	const sql = `INSERT OR REPLACE INTO users (id, email, role, created_at) VALUES ('${userId}', '${normalizedEmail}', 'admin', datetime('now'));`;

	try {
		await runWrangler(sql, isRemote);
		console.log('\nAdmin user created successfully!');
		console.log(`\nTo sign in, visit /auth/login and enter: ${normalizedEmail}`);
	} catch (err) {
		console.error('\nFailed to create admin user:', err.message);
		process.exit(1);
	}
}

main();
