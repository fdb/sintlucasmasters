#!/usr/bin/env node

/**
 * Migration script to import student data from old markdown files into D1
 *
 * This script reads all student markdown files from old/{year}/students/*.md
 * and generates SQL statements for importing into D1.
 *
 * Usage:
 *   node scripts/migrate-to-d1.mjs > migration.sql
 *   wrangler d1 execute sintlucas-masters --local --file=./migration.sql
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
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
 * Generate deterministic project ID based on student name + year
 * This ensures idempotent migrations
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
        student_name: frontmatter.student_name,
        project_title: frontmatter.project_title,
        context: frontmatter.context,
        academic_year: academicYear,
        bio: frontmatter.bio || null,
        description: description.trim(),
        main_image_id: extractCloudflareId(frontmatter.main_image),
        thumb_image_id: extractCloudflareId(frontmatter.thumb_image) || null,
        tags: frontmatter.tags ? JSON.stringify(frontmatter.tags) : null,
        social_links: frontmatter.social_links ? JSON.stringify(frontmatter.social_links) : null,
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
    return `INSERT OR REPLACE INTO projects (id, student_name, project_title, context, academic_year, bio, description, main_image_id, thumb_image_id, tags, social_links, status, created_at, updated_at)
VALUES (${sqlEscape(project.id)}, ${sqlEscape(project.student_name)}, ${sqlEscape(project.project_title)}, ${sqlEscape(project.context)}, ${sqlEscape(project.academic_year)}, ${sqlEscape(project.bio)}, ${sqlEscape(project.description)}, ${sqlEscape(project.main_image_id)}, ${sqlEscape(project.thumb_image_id)}, ${sqlEscape(project.tags)}, ${sqlEscape(project.social_links)}, ${sqlEscape(project.status)}, datetime('now'), datetime('now'));`;
}

/**
 * Generate SQL INSERT statement for an image
 */
function imageToSql(image) {
    return `INSERT OR REPLACE INTO project_images (id, project_id, cloudflare_id, sort_order, caption)
VALUES (${sqlEscape(image.id)}, ${sqlEscape(image.project_id)}, ${sqlEscape(image.cloudflare_id)}, ${image.sort_order}, ${sqlEscape(image.caption)});`;
}

/**
 * Main migration function
 */
async function migrate() {
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
            console.error(`-- Warning: Could not read ${studentsDir}: ${err.message}`);
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
                if (!project.context) {
                    errors.push(`${filePath}: Missing context`);
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

    // Output SQL
    console.log('-- Sint Lucas Masters Migration');
    console.log(`-- Generated: ${new Date().toISOString()}`);
    console.log(`-- Projects: ${allProjects.length}`);
    console.log(`-- Images: ${allImages.length}`);
    console.log('');

    if (errors.length > 0) {
        console.log('-- ERRORS:');
        for (const err of errors) {
            console.log(`-- ${err}`);
        }
        console.log('');
    }

    // Projects
    console.log('-- Projects');
    for (const project of allProjects) {
        console.log(projectToSql(project));
    }

    console.log('');

    // Images
    console.log('-- Project Images');
    for (const image of allImages) {
        console.log(imageToSql(image));
    }

    // Summary by year and context
    console.error('\n=== Migration Summary ===');
    console.error(`Total projects: ${allProjects.length}`);
    console.error(`Total images: ${allImages.length}`);
    console.error(`Errors: ${errors.length}`);

    // Group by year
    const byYear = {};
    for (const p of allProjects) {
        byYear[p.academic_year] = (byYear[p.academic_year] || 0) + 1;
    }
    console.error('\nBy year:');
    for (const [year, count] of Object.entries(byYear).sort()) {
        console.error(`  ${year}: ${count}`);
    }

    // Group by context
    const byContext = {};
    for (const p of allProjects) {
        byContext[p.context] = (byContext[p.context] || 0) + 1;
    }
    console.error('\nBy context:');
    for (const [context, count] of Object.entries(byContext).sort()) {
        console.error(`  ${context}: ${count}`);
    }

    if (errors.length > 0) {
        console.error('\nErrors:');
        for (const err of errors) {
            console.error(`  ${err}`);
        }
    }
}

migrate().catch(console.error);
