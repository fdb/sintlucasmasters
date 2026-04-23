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

export const E2E_REVIEW_STUDENT = {
  id: "e2e-student-review",
  email: "review-student@example.com",
  name: "Review Student",
  role: "student",
};

export const E2E_INCOMPLETE_STUDENT = {
  id: "e2e-student-incomplete",
  email: "incomplete-student@example.com",
  name: "Incomplete Student",
  role: "student",
};

export const E2E_MULTI_STUDENT = {
  id: "e2e-student-multi",
  email: "lisa.peeters@student.kdg.be",
  name: "Lisa Peeters",
  role: "student",
};

export const E2E_PROJECTS = [
  {
    id: "e2e-project-001",
    slug: "alice-smith",
    student_name: "Alice Smith",
    sort_name: "Smith, Alice",
    project_title_en: "Digital Dreams",
    project_title_nl: "Digitale Dromen",
    context: "digital",
    academic_year: "2024-2025",
    bio_en: "Alice is a digital artist exploring virtual realities.",
    bio_nl: "Alice is een digitale kunstenaar die virtuele realiteiten verkent.",
    description_en: "A project exploring the intersection of dreams and digital art.",
    description_nl:
      "Een project dat de kruising van dromen en digitale kunst verkent.",
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
    print_image_path: "slam/testing/print-images/24-25/submit-student.jpg",
    print_caption: "Print heading",
    print_description: "Print description for submission testing.",
    print_language: "en",
    status: "draft",
    tags: '["test"]',
    user_id: "e2e-student-submit",
  },
  {
    id: "e2e-project-reviewable",
    slug: "review-student",
    student_name: "Review Student",
    sort_name: "Student, Review",
    project_title: "Reviewable Project",
    program: "BA_FO",
    context: "autonomous",
    academic_year: "2024-2025",
    bio: "Test student for review workflow testing.",
    description: "A project with all fields complete for review workflow testing.",
    print_image_path: "slam/testing/print-images/24-25/review-student.jpg",
    print_caption: "Review print heading",
    print_description: "Print description for review testing.",
    print_language: "en",
    status: "submitted",
    tags: '["review-test"]',
    user_id: "e2e-student-review",
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
    id: "e2e-project-name-edit",
    slug: "name-edit-student",
    student_name: "Name Edit Student",
    sort_name: "Student, Name Edit",
    project_title: "Name Edit Project",
    program: "BA_FO",
    context: "applied",
    academic_year: "2024-2025",
    bio: "Dedicated project for the student-name rename test; no other test may target this row.",
    description: "Isolated mutation target for the name-rename test to avoid races with other edits.",
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
  {
    id: "e2e-project-print-mirror",
    slug: "print-mirror-student",
    student_name: "Print Mirror Student",
    sort_name: "Student, Print Mirror",
    project_title: "Print Mirror Project",
    program: "MA_BK",
    context: "digital",
    academic_year: "2024-2025",
    bio: "Test student for print mirroring.",
    description: "Base description used for print mirroring tests.",
    status: "draft",
    tags: '["print-mirror-test"]',
    user_id: null,
  },
  {
    id: "e2e-project-incomplete",
    slug: "incomplete-student",
    student_name: "Incomplete Student",
    sort_name: "Student, Incomplete",
    project_title: "Incomplete Project",
    program: "MA_BK",
    context: "autonomous",
    academic_year: "2024-2025",
    bio: "Test student for submission validation testing.",
    description: "A draft project missing print image — used for submit validation tests.",
    status: "draft",
    tags: '["validation-test"]',
    user_id: "e2e-student-incomplete",
  },
  {
    id: "e2e-project-multi-ba",
    slug: "lisa-peeters-ba",
    student_name: "Lisa Peeters",
    sort_name: "Peeters, Lisa",
    project_title: "Lichtspel",
    program: "BA_FO",
    context: "autonomous",
    academic_year: "2022-2023",
    bio: "Lisa Peeters explores light and form.",
    description: "A photographic exploration of light and shadow.",
    status: "published",
    tags: '["photography"]',
    user_id: "e2e-student-multi",
  },
  {
    id: "e2e-project-multi-prema",
    slug: "lisa-peeters-prema",
    student_name: "Lisa Peeters",
    sort_name: "Peeters, Lisa",
    project_title: "Tussenruimte",
    program: "PREMA_BK",
    context: "applied",
    academic_year: "2023-2024",
    bio: "Lisa Peeters bridges photography and fine arts.",
    description: "An applied research project on spatial perception.",
    status: "published",
    tags: '["fine-arts"]',
    user_id: "e2e-student-multi",
  },
  {
    id: "e2e-project-image-room",
    slug: "image-limit-room",
    student_name: "Image Limit Room",
    sort_name: "Room, Image Limit",
    project_title: "Image Limit Room Project",
    program: "MA_BK",
    context: "digital",
    academic_year: "2024-2025",
    bio: "Test student with room for more images.",
    description: "Project used for testing the per-project image upload cap.",
    status: "draft",
    tags: '["image-limit-test"]',
    user_id: null,
  },
  {
    id: "e2e-project-image-full",
    slug: "image-limit-full",
    student_name: "Image Limit Full",
    sort_name: "Full, Image Limit",
    project_title: "Image Limit Full Project",
    program: "MA_BK",
    context: "digital",
    academic_year: "2024-2025",
    bio: "Legacy project that already exceeds the per-project image cap.",
    description: "Used to verify legacy projects with more than 7 images are not pruned.",
    status: "draft",
    tags: '["image-limit-test"]',
    user_id: null,
  },
  {
    id: "e2e-project-multi-ma",
    slug: "lisa-peeters-ma",
    student_name: "Lisa Peeters",
    sort_name: "Peeters, Lisa",
    project_title: "Verdwijnpunt",
    program: "MA_BK",
    context: "digital",
    academic_year: "2024-2025",
    bio: "Lisa Peeters creates immersive digital installations.",
    description: "A master thesis on digital vanishing points.",
    status: "draft",
    tags: '["digital", "installation"]',
    user_id: "e2e-student-multi",
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
  // Reviewable project images
  {
    id: "e2e-pimg-review-main",
    project_id: "e2e-project-reviewable",
    cloudflare_id: "e2e-cf-review-main",
    sort_order: 0,
    caption: "Main image",
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
  // Image-limit-room project: 5 web images so 2 slots remain (limit is 7).
  ...Array.from({ length: 5 }, (_, i) => ({
    id: `e2e-pimg-room-${i + 1}`,
    project_id: "e2e-project-image-room",
    cloudflare_id: `slam/testing/image-limit-room-${i + 1}`,
    sort_order: i,
    caption: null,
    type: "web",
  })),
  // Image-limit-full project: 8 web images — legacy data exceeding the 7-image cap.
  // The cap should not retroactively prune them, but no further uploads are allowed.
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `e2e-pimg-full-${i + 1}`,
    project_id: "e2e-project-image-full",
    cloudflare_id: `slam/testing/image-limit-full-${i + 1}`,
    sort_order: i,
    caption: null,
    type: "web",
  })),
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

  // Insert review test student user
  console.log("Creating review test student user...");
  await runWrangler(
    `INSERT INTO users (id, email, name, role, created_at) VALUES (${escapeSql(E2E_REVIEW_STUDENT.id)}, ${escapeSql(E2E_REVIEW_STUDENT.email)}, ${escapeSql(E2E_REVIEW_STUDENT.name)}, ${escapeSql(E2E_REVIEW_STUDENT.role)}, datetime('now'))`
  );

  // Insert incomplete student user (for submit validation tests)
  console.log("Creating incomplete student user...");
  await runWrangler(
    `INSERT INTO users (id, email, name, role, created_at) VALUES (${escapeSql(E2E_INCOMPLETE_STUDENT.id)}, ${escapeSql(E2E_INCOMPLETE_STUDENT.email)}, ${escapeSql(E2E_INCOMPLETE_STUDENT.name)}, ${escapeSql(E2E_INCOMPLETE_STUDENT.role)}, datetime('now'))`
  );

  // Insert multi-project student user
  console.log("Creating multi-project student user...");
  await runWrangler(
    `INSERT INTO users (id, email, name, role, created_at) VALUES (${escapeSql(E2E_MULTI_STUDENT.id)}, ${escapeSql(E2E_MULTI_STUDENT.email)}, ${escapeSql(E2E_MULTI_STUDENT.name)}, ${escapeSql(E2E_MULTI_STUDENT.role)}, datetime('now'))`
  );

  // Insert projects
  console.log("Creating projects...");
  for (const project of E2E_PROJECTS) {
    const titleEn = "project_title_en" in project ? project.project_title_en : project.project_title;
    const titleNl = "project_title_nl" in project ? project.project_title_nl : project.project_title;
    const bioEn = "bio_en" in project ? project.bio_en : project.bio;
    const bioNl = "bio_nl" in project ? project.bio_nl : project.bio;
    const descEn = "description_en" in project ? project.description_en : project.description;
    const descNl = "description_nl" in project ? project.description_nl : project.description;
    const printImagePath = "print_image_path" in project ? project.print_image_path : null;
    const printCaption = "print_caption" in project ? project.print_caption : null;
    const printDescription = "print_description" in project ? project.print_description : null;
    const printLanguage = "print_language" in project ? project.print_language : null;
    await runWrangler(
      `INSERT INTO projects (id, slug, student_name, sort_name, project_title_en, project_title_nl, program, context, academic_year, bio_en, bio_nl, description_en, description_nl, location_en, location_nl, print_image_path, print_caption, print_description, print_language, alumni_consent, status, tags, user_id, created_at, updated_at) VALUES (${escapeSql(project.id)}, ${escapeSql(project.slug)}, ${escapeSql(project.student_name)}, ${escapeSql(project.sort_name)}, ${escapeSql(titleEn)}, ${escapeSql(titleNl)}, ${project.program ? escapeSql(project.program) : "NULL"}, ${escapeSql(project.context)}, ${escapeSql(project.academic_year)}, ${escapeSql(bioEn)}, ${escapeSql(bioNl)}, ${escapeSql(descEn)}, ${escapeSql(descNl)}, 'Antwerp, Belgium', 'Antwerpen, België', ${escapeSql(printImagePath)}, ${escapeSql(printCaption)}, ${escapeSql(printDescription)}, ${escapeSql(printLanguage)}, 0, ${escapeSql(project.status)}, ${escapeSql(project.tags)}, ${project.user_id ? escapeSql(project.user_id) : "NULL"}, datetime('now'), datetime('now'))`
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
  console.log(`  - 5 student users: ${E2E_STUDENT.email}, ${E2E_SUBMIT_STUDENT.email}, ${E2E_REVIEW_STUDENT.email}, ${E2E_INCOMPLETE_STUDENT.email}, ${E2E_MULTI_STUDENT.email}`);
  console.log(`  - ${E2E_PROJECTS.length} projects`);
  console.log(`  - ${E2E_PROJECT_IMAGES.length} project images`);
}

main().catch((err) => {
  console.error("Failed to seed E2E database:", err.message);
  process.exit(1);
});
