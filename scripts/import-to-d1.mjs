#!/usr/bin/env node

/**
 * Import legacy student data from old markdown files into D1
 *
 * This script reads all student markdown files from old/{year}/students/*.md
 * and executes SQL statements to import into D1.
 *
 * Usage:
 *   node scripts/import-to-d1.mjs --local   # Import to local D1
 *   node scripts/import-to-d1.mjs --remote  # Import to production D1
 */

import { readdir, readFile, writeFile, unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import matter from 'gray-matter';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

const CF_BASE = 'https://imagedelivery.net/7-GLn6-56OyK7JwwGe0hfg/';
const YEARS = ['2021', '2022', '2023', '2024', '2025'];

/**
 * Extract Cloudflare Image ID from various formats
 */
function extractCloudflareId(imageRef) {
    if (!imageRef) return null;

    // Handle full Cloudflare URLs (2021-2023 format)
    if (imageRef.startsWith(CF_BASE)) {
        // Remove base URL and any variant suffix
        return imageRef.replace(CF_BASE, '').split('/')[0];
    }

    // Handle relative paths (2024-2025 format)
    // These are already valid Cloudflare IDs
    return imageRef;
}

/**
 * Normalize year format from "2020—2021" to "2020-2021"
 */
function normalizeYear(year) {
    if (!year) return '';
    return String(year).replace(/—/g, '-');
}

/**
 * Generate URL-safe slug from student name
 */
function slugify(name) {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[^a-z0-9]+/g, '-')     // Replace non-alphanumeric with hyphens
        .replace(/^-+|-+$/g, '');        // Trim leading/trailing hyphens
}

/**
 * Generate ASCII-normalized name for sorting
 * This ensures names like "Çifel" sort with "C" names
 */
function sortName(name) {
    return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .toLowerCase();
}

/**
 * Generate deterministic project ID based on student name + year
 * This ensures idempotent imports
 */
function generateProjectId(studentName, academicYear) {
    const hash = createHash('sha256')
        .update(`${studentName}:${academicYear}`)
        .digest('hex');
    return hash.substring(0, 32);
}

/**
 * Generate deterministic image ID
 */
function generateImageId(projectId, cloudflareId, sortOrder) {
    const hash = createHash('sha256')
        .update(`${projectId}:${cloudflareId}:${sortOrder}`)
        .digest('hex');
    return hash.substring(0, 32);
}

/**
 * Normalize URL to ensure it has a protocol
 */
function normalizeUrl(url) {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    return `https://${url}`;
}

/**
 * Escape single quotes for SQL
 */
function sqlEscape(str) {
    if (str === null || str === undefined) return 'NULL';
    return `'${String(str).replace(/'/g, "''")}'`;
}

/**
 * Parse a single student markdown file
 */
async function parseStudentFile(filePath) {
    const content = await readFile(filePath, 'utf-8');
    const { data: frontmatter, content: description } = matter(content);

    const academicYear = normalizeYear(frontmatter.year);
    const projectId = generateProjectId(frontmatter.student_name, academicYear);

    const project = {
        id: projectId,
        slug: slugify(frontmatter.student_name),
        student_name: frontmatter.student_name,
        sort_name: sortName(frontmatter.student_name),
        project_title: frontmatter.project_title,
        program: frontmatter.program || 'MA_BK', // Default to MA_BK for legacy data
        context: frontmatter.context || null,
        academic_year: academicYear,
        bio: frontmatter.bio || null,
        description: description.trim(),
        main_image_id: extractCloudflareId(frontmatter.main_image),
        thumb_image_id: extractCloudflareId(frontmatter.thumb_image) || null,
        tags: frontmatter.tags ? JSON.stringify(frontmatter.tags) : null,
        social_links: frontmatter.social_links ? JSON.stringify(frontmatter.social_links.map(normalizeUrl)) : null,
        status: 'published'
    };

    // Parse gallery images
    const images = (frontmatter.images || []).map((img, index) => ({
        id: generateImageId(projectId, extractCloudflareId(img), index),
        project_id: projectId,
        cloudflare_id: extractCloudflareId(img),
        sort_order: index,
        caption: null
    }));

    return { project, images, filePath };
}

/**
 * Generate SQL INSERT statement for a project
 */
function projectToSql(project) {
    return `INSERT OR REPLACE INTO projects (id, slug, student_name, sort_name, project_title, program, context, academic_year, bio, description, main_image_id, thumb_image_id, tags, social_links, status, created_at, updated_at)
VALUES (${sqlEscape(project.id)}, ${sqlEscape(project.slug)}, ${sqlEscape(project.student_name)}, ${sqlEscape(project.sort_name)}, ${sqlEscape(project.project_title)}, ${sqlEscape(project.program)}, ${sqlEscape(project.context)}, ${sqlEscape(project.academic_year)}, ${sqlEscape(project.bio)}, ${sqlEscape(project.description)}, ${sqlEscape(project.main_image_id)}, ${sqlEscape(project.thumb_image_id)}, ${sqlEscape(project.tags)}, ${sqlEscape(project.social_links)}, ${sqlEscape(project.status)}, datetime('now'), datetime('now'));`;
}

/**
 * Generate SQL INSERT statement for an image
 */
function imageToSql(image) {
    return `INSERT OR REPLACE INTO project_images (id, project_id, cloudflare_id, sort_order, caption, type)
VALUES (${sqlEscape(image.id)}, ${sqlEscape(image.project_id)}, ${sqlEscape(image.cloudflare_id)}, ${image.sort_order}, ${sqlEscape(image.caption)}, 'web');`;
}

/**
 * Run wrangler d1 execute with the given SQL file
 */
function runWrangler(sqlFile, isRemote) {
    return new Promise((resolve, reject) => {
        const args = ['d1', 'execute', 'sintlucasmasters', isRemote ? '--remote' : '--local', '--file', sqlFile];
        console.log(`Running: wrangler ${args.join(' ')}`);

        const child = spawn('npx', ['wrangler', ...args], {
            stdio: 'inherit',
            cwd: PROJECT_ROOT
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

/**
 * Main import function
 */
async function importData() {
    // Parse arguments
    const args = process.argv.slice(2);
    const isRemote = args.includes('--remote');
    const isLocal = args.includes('--local');
    const isReset = args.includes('--reset');

    if (!isRemote && !isLocal) {
        console.error('Usage: node scripts/import-to-d1.mjs --local|--remote [--reset]');
        process.exit(1);
    }

    console.log(`${isReset ? 'Resetting and importing' : 'Importing'} to ${isRemote ? 'REMOTE (production)' : 'LOCAL'} D1 database...\n`);

    const allProjects = [];
    const allImages = [];
    const errors = [];

    // Process each year
    for (const year of YEARS) {
        const studentsDir = join(PROJECT_ROOT, 'old', year, 'students');

        let files;
        try {
            files = await readdir(studentsDir);
        } catch (err) {
            console.error(`Warning: Could not read ${studentsDir}: ${err.message}`);
            continue;
        }

        const mdFiles = files.filter(f => f.endsWith('.md') && f !== 'students.json');

        for (const file of mdFiles) {
            try {
                const { project, images, filePath } = await parseStudentFile(join(studentsDir, file));

                // Validate required fields
                if (!project.student_name) {
                    errors.push(`${filePath}: Missing student_name`);
                    continue;
                }
                if (!project.project_title) {
                    errors.push(`${filePath}: Missing project_title`);
                    continue;
                }
                // Context is required for MA_BK and PREMA_BK programs
                if ((project.program === 'MA_BK' || project.program === 'PREMA_BK') && !project.context) {
                    errors.push(`${filePath}: Missing context (required for ${project.program})`);
                    continue;
                }
                if (!project.main_image_id) {
                    errors.push(`${filePath}: Missing main_image`);
                    continue;
                }

                allProjects.push(project);
                allImages.push(...images);
            } catch (err) {
                errors.push(`${file}: ${err.message}`);
            }
        }
    }

    // Build SQL
    const sqlLines = [
        '-- Sint Lucas Masters Import',
        `-- Generated: ${new Date().toISOString()}`,
        `-- Projects: ${allProjects.length}`,
        `-- Images: ${allImages.length}`,
        ''
    ];

    if (errors.length > 0) {
        sqlLines.push('-- ERRORS:');
        for (const err of errors) {
            sqlLines.push(`-- ${err}`);
        }
        sqlLines.push('');
    }

    // Reset tables if requested
    if (isReset) {
        sqlLines.push('-- Reset tables');
        sqlLines.push('DELETE FROM project_images;');
        sqlLines.push('DELETE FROM projects;');
        sqlLines.push('');
    }

    // Projects
    sqlLines.push('-- Projects');
    for (const project of allProjects) {
        sqlLines.push(projectToSql(project));
    }

    sqlLines.push('');

    // Images
    sqlLines.push('-- Project Images');
    for (const image of allImages) {
        sqlLines.push(imageToSql(image));
    }

    // Write to temp file
    const sqlFile = join(PROJECT_ROOT, '.import-temp.sql');
    await writeFile(sqlFile, sqlLines.join('\n'), 'utf-8');

    // Summary
    console.log('=== Import Summary ===');
    console.log(`Total projects: ${allProjects.length}`);
    console.log(`Total images: ${allImages.length}`);
    console.log(`Errors: ${errors.length}`);

    // Group by year
    const byYear = {};
    for (const p of allProjects) {
        byYear[p.academic_year] = (byYear[p.academic_year] || 0) + 1;
    }
    console.log('\nBy year:');
    for (const [year, count] of Object.entries(byYear).sort()) {
        console.log(`  ${year}: ${count}`);
    }

    // Group by program
    const byProgram = {};
    for (const p of allProjects) {
        byProgram[p.program] = (byProgram[p.program] || 0) + 1;
    }
    console.log('\nBy program:');
    for (const [program, count] of Object.entries(byProgram).sort()) {
        console.log(`  ${program}: ${count}`);
    }

    // Group by context
    const byContext = {};
    for (const p of allProjects) {
        if (p.context) {
            byContext[p.context] = (byContext[p.context] || 0) + 1;
        }
    }
    console.log('\nBy context:');
    for (const [context, count] of Object.entries(byContext).sort()) {
        console.log(`  ${context}: ${count}`);
    }

    if (errors.length > 0) {
        console.log('\nErrors:');
        for (const err of errors) {
            console.log(`  ${err}`);
        }
    }

    // Execute import
    console.log('\nExecuting import...\n');
    try {
        await runWrangler(sqlFile, isRemote);
        console.log('\nImport completed successfully!');
    } finally {
        // Clean up temp file
        await unlink(sqlFile).catch(() => {});
    }
}

importData().catch((err) => {
    console.error('Import failed:', err.message);
    process.exit(1);
});
