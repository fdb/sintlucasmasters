#!/usr/bin/env node

/**
 * Seed E2E test database with minimal test data
 *
 * Usage:
 *   npm run test:e2e:db:seed
 *
 * This creates a small dataset for admin E2E tests:
 * - 1 admin user (matches E2E_TEST_USER in auth middleware)
 * - 1 existing student user (for duplicate detection in bulk import)
 * - 3 projects across 2 years and 2 contexts
 * - 2 images on one project (for reorder testing)
 */

import { spawn } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");
const E2E_PERSIST_PATH = ".wrangler/e2e-state";

// Test data constants - export these for use in test files
export const E2E_ADMIN = {
  id: "e2e-admin-001",
  email: "e2e-admin@example.com",
  role: "admin",
};

export const E2E_STUDENT = {
  id: "e2e-student-001",
  email: "existing-student@example.com",
  name: "Existing Student",
  role: "student",
};

export const E2E_SUBMIT_STUDENT = {
  id: "e2e-student-submit",
  email: "submit-student@example.com",
  name: "Submit Student",
  role: "student",
};

export const E2E_PROJECTS = [
  {
    id: "e2e-project-001",
    slug: "alice-smith",
    student_name: "Alice Smith",
    sort_name: "Smith, Alice",
    project_title: "Digital Dreams",
    context: "digital",
    academic_year: "2024-2025",
    bio: "Alice is a digital artist exploring virtual realities.",
    description: "A project exploring the intersection of dreams and digital art.",
    status: "published",
    tags: '["digital", "interactive"]',
    user_id: null,
  },
  {
    id: "e2e-project-002",
    slug: "bob-jones",
    student_name: "Bob Jones",
    sort_name: "Jones, Bob",
    project_title: "Autonomous Sculptures",
    context: "autonomous",
    academic_year: "2024-2025",
    bio: "Bob creates sculptures that move on their own.",
    description: "Self-moving sculptures that respond to their environment.",
    status: "draft",
    tags: '["sculpture", "kinetic"]',
    user_id: "e2e-student-001",
  },
  {
    id: "e2e-project-003",
    slug: "carol-white",
    student_name: "Carol White",
    sort_name: "White, Carol",
    project_title: "Applied Design Systems",
    context: "applied",
    academic_year: "2023-2024",
    bio: "Carol specializes in systematic design approaches.",
    description: "A comprehensive design system for urban environments.",
    status: "published",
    tags: '["design", "systems"]',
    user_id: null,
  },
  {
    id: "e2e-project-video",
    slug: "video-student",
    student_name: "Video Student",
    sort_name: "Student, Video",
    project_title: "Video Documentation Project",
    context: "digital",
    academic_year: "2024-2025",
    bio: "Video Student explores multimedia storytelling.",
    description:
      "This project explores video documentation.\n\nWatch the YouTube video: https://www.youtube.com/watch?v=dQw4w9WgXcQ\n\nAnd here is a Vimeo video: https://vimeo.com/123456789\n\nThank you for watching!",
    status: "published",
    tags: '["video", "documentation"]',
    user_id: null,
  },
  {
    id: "e2e-project-submittable",
    slug: "submit-student",
    student_name: "Submit Student",
    sort_name: "Student, Submit",
    project_title: "Submittable Project",
    program: "MA_BK",
    context: "digital",
    academic_year: "2024-2025",
    bio: "Test student for submission testing.",
    description: "A project with all fields complete for submission testing.",
    status: "draft",
    tags: '["test"]',
    user_id: "e2e-student-submit",
  },
  {
    id: "e2e-project-editable",
    slug: "editable-student",
    student_name: "Editable Student",
    sort_name: "Student, Editable",
    project_title: "Editable Project",
    program: "BA_FO",
    context: "applied",
    academic_year: "2024-2025",
    bio: "Test student for edit save testing.",
    description: "A project used exclusively for testing edit and save functionality.",
    status: "draft",
    tags: '["edit-test"]',
    user_id: null,
  },
  {
    id: "e2e-project-translate",
    slug: "translate-student",
    student_name: "Translate Student",
    sort_name: "Student, Translate",
    project_title: "Translation Test Project",
    program: "MA_BK",
    context: "digital",
    academic_year: "2024-2025",
    bio: "Vertaaltestbiografie voor E2E-tests.",
    bio_en: "",
    description: "Vertaaltestbeschrijving voor E2E-tests.",
    description_en: "",
    status: "draft",
    tags: '["translate-test"]',
    user_id: null,
  },
];

export const E2E_PROJECT_IMAGES = [
  {
    id: "e2e-pimg-001",
    project_id: "e2e-project-001",
    cloudflare_id: "slam/testing/e2e-test-image",
    sort_order: 0,
    caption: "Main view",
    type: "web",
  },
  {
    id: "e2e-pimg-002",
    project_id: "e2e-project-001",
    cloudflare_id: "slam/testing/e2e-test-image",
    sort_order: 1,
    caption: "Detail shot",
    type: "web",
  },
  // Submittable project images (has main image + print image with caption)
  {
    id: "e2e-pimg-submit-main",
    project_id: "e2e-project-submittable",
    cloudflare_id: "e2e-cf-submit-main",
    sort_order: 0,
    caption: "Main image",
    type: "web",
  },
  {
    id: "e2e-pimg-submit-print",
    project_id: "e2e-project-submittable",
    cloudflare_id: "e2e-cf-submit-print",
    sort_order: 0,
    caption: "Print image caption for submission",
    type: "print",
  },
];

/**
 * Run wrangler d1 execute with a command against E2E database
 */
function runWrangler(command) {
  return new Promise((resolve, reject) => {
    const args = [
      "d1",
      "execute",
      "sintlucasmasters",
      "--local",
      "--persist-to",
      E2E_PERSIST_PATH,
      "--command",
      command,
    ];

    const child = spawn("npx", ["wrangler", ...args], {
      stdio: "pipe",
      cwd: PROJECT_ROOT,
    });

    let stderr = "";
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`wrangler exited with code ${code}: ${stderr}`));
      }
    });

    child.on("error", reject);
  });
}

/**
 * Escape single quotes in SQL strings
 */
function escapeSql(str) {
  if (str === null || str === undefined) return "NULL";
  return `'${String(str).replace(/'/g, "''")}'`;
}

async function main() {
  console.log("Seeding E2E test database...\n");

  // Clear existing test data first (in case of re-run)
  console.log("Clearing existing E2E data...");
  await runWrangler("DELETE FROM project_images WHERE id LIKE 'e2e-%'");
  await runWrangler("DELETE FROM projects WHERE id LIKE 'e2e-%'");
  await runWrangler("DELETE FROM users WHERE id LIKE 'e2e-%'");

  // Insert admin user
  console.log("Creating admin user...");
  await runWrangler(
    `INSERT INTO users (id, email, role, created_at) VALUES (${escapeSql(E2E_ADMIN.id)}, ${escapeSql(E2E_ADMIN.email)}, ${escapeSql(E2E_ADMIN.role)}, datetime('now'))`
  );

  // Insert student user
  console.log("Creating student user...");
  await runWrangler(
    `INSERT INTO users (id, email, name, role, created_at) VALUES (${escapeSql(E2E_STUDENT.id)}, ${escapeSql(E2E_STUDENT.email)}, ${escapeSql(E2E_STUDENT.name)}, ${escapeSql(E2E_STUDENT.role)}, datetime('now'))`
  );

  // Insert submit test student user
  console.log("Creating submit test student user...");
  await runWrangler(
    `INSERT INTO users (id, email, name, role, created_at) VALUES (${escapeSql(E2E_SUBMIT_STUDENT.id)}, ${escapeSql(E2E_SUBMIT_STUDENT.email)}, ${escapeSql(E2E_SUBMIT_STUDENT.name)}, ${escapeSql(E2E_SUBMIT_STUDENT.role)}, datetime('now'))`
  );

  // Insert projects
  console.log("Creating projects...");
  for (const project of E2E_PROJECTS) {
    const bioEn = "bio_en" in project ? project.bio_en : project.bio;
    const descEn = "description_en" in project ? project.description_en : project.description;
    await runWrangler(
      `INSERT INTO projects (id, slug, student_name, sort_name, project_title_en, project_title_nl, program, context, academic_year, bio_en, bio_nl, description_en, description_nl, location_en, location_nl, alumni_consent, status, tags, user_id, created_at, updated_at) VALUES (${escapeSql(project.id)}, ${escapeSql(project.slug)}, ${escapeSql(project.student_name)}, ${escapeSql(project.sort_name)}, ${escapeSql(project.project_title)}, ${escapeSql(project.project_title)}, ${project.program ? escapeSql(project.program) : "NULL"}, ${escapeSql(project.context)}, ${escapeSql(project.academic_year)}, ${escapeSql(bioEn)}, ${escapeSql(project.bio)}, ${escapeSql(descEn)}, ${escapeSql(project.description)}, 'Antwerp, Belgium', 'Antwerpen, België', 0, ${escapeSql(project.status)}, ${escapeSql(project.tags)}, ${project.user_id ? escapeSql(project.user_id) : "NULL"}, datetime('now'), datetime('now'))`
    );
  }

  // Insert project images
  console.log("Creating project images...");
  for (const image of E2E_PROJECT_IMAGES) {
    await runWrangler(
      `INSERT INTO project_images (id, project_id, cloudflare_id, sort_order, caption, type) VALUES (${escapeSql(image.id)}, ${escapeSql(image.project_id)}, ${escapeSql(image.cloudflare_id)}, ${image.sort_order}, ${escapeSql(image.caption)}, ${escapeSql(image.type || "web")})`
    );
  }

  console.log("\nE2E database seeded successfully!");
  console.log(`  - 1 admin user: ${E2E_ADMIN.email}`);
  console.log(`  - 2 student users: ${E2E_STUDENT.email}, ${E2E_SUBMIT_STUDENT.email}`);
  console.log(`  - ${E2E_PROJECTS.length} projects`);
  console.log(`  - ${E2E_PROJECT_IMAGES.length} project images`);
}

main().catch((err) => {
  console.error("Failed to seed E2E database:", err.message);
  process.exit(1);
});
