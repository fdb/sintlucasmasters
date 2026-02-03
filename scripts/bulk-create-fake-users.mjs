#!/usr/bin/env node

/**
 * Bulk-create fake student users + empty projects for a fixed list.
 *
 * Usage:
 *   node scripts/bulk-create-fake-users.mjs --local
 *   node scripts/bulk-create-fake-users.mjs --remote
 */

import { spawn } from 'child_process';
import { createHash } from 'crypto';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

const PROGRAM = 'MA_BK';
const ACADEMIC_YEAR = '2025-2026';

const STUDENTS = [
  {
    name: 'Austen Egbert',
    email: 'austen.egbert@student.kdg.be',
    context: 'autonomous',
  },
  {
    name: 'Berenice Adahmov',
    email: 'berenice.adahmov@student.kdg.be',
    context: 'applied',
  },
  {
    name: 'Filip Reese',
    email: 'filip.reese@student.kdg.be',
    context: 'jewelry',
  },
  {
    name: 'Pascal Genens',
    email: 'pascal.genens@student.kdg.be',
    context: 'digital',
  },
  {
    name: 'Cecilia De Klerk',
    email: 'cecilia.de.klerk@student.kdg.be',
    context: 'socio-political',
  },
];

function sqlEscape(value) {
  return value.replace(/'/g, "''");
}

function normalizeContext(input) {
  const normalized = input.trim().toLowerCase();
  const contextMap = {
    autonomous: 'Autonomous Context',
    'autonomous context': 'Autonomous Context',
    applied: 'Applied Context',
    'applied context': 'Applied Context',
    digital: 'Digital Context',
    'digital context': 'Digital Context',
    'socio-political': 'Socio-Political Context',
    'socio-political context': 'Socio-Political Context',
    sociopolitical: 'Socio-Political Context',
    'sociopolitical context': 'Socio-Political Context',
    jewelry: 'Jewelry Context',
    'jewelry context': 'Jewelry Context',
  };

  return contextMap[normalized] || null;
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

function generateSortName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function generateUserId(email) {
  const hash = createHash('sha256').update(email.toLowerCase()).digest('hex');
  return hash.substring(0, 32);
}

function generateProjectId(name, academicYear) {
  const input = `${name}:${academicYear}`;
  return createHash('sha256').update(input).digest('hex');
}

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

function buildSql() {
  const statements = [];

  for (const student of STUDENTS) {
    const normalizedEmail = student.email.trim().toLowerCase();
    const name = student.name.trim();
    const context = normalizeContext(student.context);

    if (!context) {
      throw new Error(`Invalid context for ${name}: ${student.context}`);
    }

    const userId = generateUserId(normalizedEmail);
    const projectId = generateProjectId(name, ACADEMIC_YEAR);
    const slug = slugify(name);
    const sortName = generateSortName(name);

    statements.push(
      `INSERT INTO users (id, email, name, role) ` +
        `SELECT '${sqlEscape(userId)}', '${sqlEscape(normalizedEmail)}', '${sqlEscape(name)}', 'student' ` +
        `WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = '${sqlEscape(normalizedEmail)}');`
    );

    statements.push(
      `INSERT INTO projects (` +
        `id, slug, student_name, sort_name, project_title, program, context, academic_year, bio, description, main_image_id, status, user_id` +
        `) SELECT ` +
        `'${sqlEscape(projectId)}', ` +
        `'${sqlEscape(slug)}', ` +
        `'${sqlEscape(name)}', ` +
        `'${sqlEscape(sortName)}', ` +
        `'', ` +
        `'${PROGRAM}', ` +
        `'${sqlEscape(context)}', ` +
        `'${ACADEMIC_YEAR}', ` +
        `NULL, ` +
        `'', ` +
        `NULL, ` +
        `'draft', ` +
        `(SELECT id FROM users WHERE email = '${sqlEscape(normalizedEmail)}') ` +
        `WHERE NOT EXISTS (SELECT 1 FROM projects WHERE id = '${sqlEscape(projectId)}') ` +
        `AND EXISTS (SELECT 1 FROM users WHERE email = '${sqlEscape(normalizedEmail)}');`
    );
  }

  return statements.join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const isRemote = args.includes('--remote');
  const isLocal = args.includes('--local');

  if (!isRemote && !isLocal) {
    console.error('Usage: node scripts/bulk-create-fake-users.mjs --local|--remote');
    process.exit(1);
  }

  console.log('Bulk-creating fake MA_BK students + empty projects...');
  console.log(`  Academic year: ${ACADEMIC_YEAR}`);
  console.log(`  Program: ${PROGRAM}`);
  console.log(`  Target: ${isRemote ? 'REMOTE (production)' : 'LOCAL'} database`);
  console.log('');

  const sql = buildSql();

  try {
    await runWrangler(sql, isRemote);
    console.log('\nDone. Inserts are idempotent; re-running will skip existing users/projects.');
  } catch (err) {
    console.error('\nFailed to bulk-create fake users:', err.message);
    process.exit(1);
  }
}

main();
