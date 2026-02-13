#!/usr/bin/env node

/**
 * Import legacy student data from bilingual markdown files into D1.
 *
 * Expected file format per project:
 *   old/{year}/students/{slug}_en.md
 *   old/{year}/students/{slug}_nl.md
 *
 * Requirements:
 * - Both files must exist for each project
 * - Frontmatter must contain lang: en/nl matching filename suffix
 * - Context must normalize to canonical context keys
 *
 * Usage:
 *   node scripts/import-to-d1.mjs --local
 *   node scripts/import-to-d1.mjs --remote
 */

import { readdir, readFile, writeFile, unlink } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import matter from "gray-matter";
import { createHash } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");

const CF_BASE = "https://imagedelivery.net/7-GLn6-56OyK7JwwGe0hfg/";
const YEARS = ["2021", "2022", "2023", "2024", "2025"];

function extractCloudflareId(imageRef) {
  if (!imageRef) return null;
  if (imageRef.startsWith(CF_BASE)) {
    return imageRef.replace(CF_BASE, "").split("/")[0];
  }
  return imageRef;
}

function normalizeYear(year) {
  if (!year) return "";
  return String(year).replace(/—/g, "-");
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sortName(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeContextKey(input) {
  if (!input) return null;
  const normalized = String(input).trim().toLowerCase();
  const map = {
    autonomous: "autonomous",
    "autonomous context": "autonomous",
    applied: "applied",
    "applied context": "applied",
    digital: "digital",
    "digital context": "digital",
    sociopolitical: "sociopolitical",
    "sociopolitical context": "sociopolitical",
    "socio-political": "sociopolitical",
    "socio-political context": "sociopolitical",
    jewelry: "jewelry",
    "jewelry context": "jewelry",
  };
  return map[normalized] || null;
}

function generateProjectId(studentName, academicYear) {
  const hash = createHash("sha256").update(`${studentName}:${academicYear}`).digest("hex");
  return hash.substring(0, 32);
}

function generateImageId(projectId, cloudflareId, sortOrder) {
  const hash = createHash("sha256").update(`${projectId}:${cloudflareId}:${sortOrder}`).digest("hex");
  return hash.substring(0, 32);
}

function normalizeUrl(url) {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `https://${url}`;
}

function sqlEscape(str) {
  if (str === null || str === undefined) return "NULL";
  return `'${String(str).replace(/'/g, "''")}'`;
}

function filenameInfo(file) {
  const match = file.match(/^(.*)_(en|nl)\.md$/);
  if (!match) return null;
  return { base: match[1], lang: match[2] };
}

async function parseLangFile(filePath, expectedLang) {
  const content = await readFile(filePath, "utf-8");
  const { data: frontmatter, content: description } = matter(content);

  const declaredLang = String(frontmatter.lang || "")
    .trim()
    .toLowerCase();
  if (declaredLang !== expectedLang) {
    throw new Error(`Expected lang=${expectedLang}, got lang=${declaredLang || "(missing)"}`);
  }

  const academicYear = normalizeYear(frontmatter.year);
  const context = normalizeContextKey(frontmatter.context || null);

  return {
    frontmatter,
    content: description.trim(),
    academicYear,
    context,
    tags: frontmatter.tags ? JSON.stringify(frontmatter.tags) : null,
    socialLinks: frontmatter.social_links ? JSON.stringify(frontmatter.social_links.map(normalizeUrl)) : null,
    mainImageId: extractCloudflareId(frontmatter.main_image),
    thumbImageId: extractCloudflareId(frontmatter.thumb_image) || null,
  };
}

function buildImageIds(parsed) {
  const imageIds = [];
  const seen = new Set();

  const add = (id) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    imageIds.push(id);
  };

  add(parsed.mainImageId);
  for (const img of parsed.frontmatter.images || []) {
    add(extractCloudflareId(img));
  }

  return imageIds;
}

function sameJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function mergeProjectPair(enParsed, nlParsed, year, baseName) {
  const errors = [];

  const studentNameEn = String(enParsed.frontmatter.student_name || "").trim();
  const studentNameNl = String(nlParsed.frontmatter.student_name || "").trim();
  if (!studentNameEn || !studentNameNl) {
    errors.push("Missing student_name in one or both language files");
  } else if (studentNameEn !== studentNameNl) {
    errors.push(`student_name mismatch: en='${studentNameEn}', nl='${studentNameNl}'`);
  }

  if (!enParsed.academicYear || !nlParsed.academicYear) {
    errors.push("Missing year in one or both language files");
  } else if (enParsed.academicYear !== nlParsed.academicYear) {
    errors.push(`year mismatch: en='${enParsed.academicYear}', nl='${nlParsed.academicYear}'`);
  }

  const programEn = enParsed.frontmatter.program || "MA_BK";
  const programNl = nlParsed.frontmatter.program || "MA_BK";
  if (programEn !== programNl) {
    errors.push(`program mismatch: en='${programEn}', nl='${programNl}'`);
  }

  if (!enParsed.context || !nlParsed.context) {
    errors.push("Missing/invalid context in one or both language files");
  } else if (enParsed.context !== nlParsed.context) {
    errors.push(`context mismatch: en='${enParsed.context}', nl='${nlParsed.context}'`);
  }

  const enImageIds = buildImageIds(enParsed);
  const nlImageIds = buildImageIds(nlParsed);
  if (!sameJson(enImageIds, nlImageIds)) {
    errors.push("Image list mismatch between language files");
  }

  const enTags = enParsed.frontmatter.tags || [];
  const nlTags = nlParsed.frontmatter.tags || [];
  if (!sameJson(enTags, nlTags)) {
    errors.push("tags mismatch between language files");
  }

  const enSocial = enParsed.frontmatter.social_links || [];
  const nlSocial = nlParsed.frontmatter.social_links || [];
  if (!sameJson(enSocial, nlSocial)) {
    errors.push("social_links mismatch between language files");
  }

  const mainImageEn = enParsed.mainImageId || null;
  const mainImageNl = nlParsed.mainImageId || null;
  if (mainImageEn !== mainImageNl) {
    errors.push("main_image mismatch between language files");
  }

  const thumbImageEn = enParsed.thumbImageId || null;
  const thumbImageNl = nlParsed.thumbImageId || null;
  if (thumbImageEn !== thumbImageNl) {
    errors.push("thumb_image mismatch between language files");
  }

  const projectTitleEn = String(enParsed.frontmatter.project_title || "").trim();
  const projectTitleNl = String(nlParsed.frontmatter.project_title || "").trim();
  if (!projectTitleEn) errors.push("Missing project_title in _en file");
  if (!projectTitleNl) errors.push("Missing project_title in _nl file");

  if (!enParsed.content) errors.push("Missing description content in _en file");
  if (!nlParsed.content) errors.push("Missing description content in _nl file");

  if (errors.length > 0) {
    return {
      errors: errors.map((error) => `${year}/${baseName}: ${error}`),
      project: null,
      images: [],
    };
  }

  const academicYear = enParsed.academicYear;
  const studentName = studentNameEn;
  const projectId = generateProjectId(studentName, academicYear);

  const locationEnRaw = enParsed.frontmatter.location;
  const locationNlRaw = nlParsed.frontmatter.location;
  const locationEn = locationEnRaw || locationNlRaw || null;
  const locationNl = locationNlRaw || locationEnRaw || null;

  const project = {
    id: projectId,
    slug: slugify(studentName),
    student_name: studentName,
    sort_name: sortName(studentName),
    project_title_en: projectTitleEn,
    project_title_nl: projectTitleNl,
    program: programEn,
    context: enParsed.context,
    academic_year: academicYear,
    bio_en: enParsed.frontmatter.bio || null,
    bio_nl: nlParsed.frontmatter.bio || null,
    description_en: enParsed.content,
    description_nl: nlParsed.content,
    location_en: locationEn,
    location_nl: locationNl,
    thumb_image_id: thumbImageEn,
    tags: enParsed.tags,
    social_links: enParsed.socialLinks,
    status: "published",
  };

  const images = enImageIds.map((cloudflareId, index) => ({
    id: generateImageId(projectId, cloudflareId, index),
    project_id: projectId,
    cloudflare_id: cloudflareId,
    sort_order: index,
    caption: null,
  }));

  return { errors: [], project, images };
}

function projectToSql(project) {
  return `INSERT OR REPLACE INTO projects (
    id, slug, student_name, sort_name,
    project_title_en, project_title_nl,
    program, context, academic_year,
    bio_en, bio_nl,
    description_en, description_nl,
    location_en, location_nl,
    private_email, alumni_consent, thumb_image_id,
    tags, social_links, status,
    created_at, updated_at
  ) VALUES (
    ${sqlEscape(project.id)}, ${sqlEscape(project.slug)}, ${sqlEscape(project.student_name)}, ${sqlEscape(project.sort_name)},
    ${sqlEscape(project.project_title_en)}, ${sqlEscape(project.project_title_nl)},
    ${sqlEscape(project.program)}, ${sqlEscape(project.context)}, ${sqlEscape(project.academic_year)},
    ${sqlEscape(project.bio_en)}, ${sqlEscape(project.bio_nl)},
    ${sqlEscape(project.description_en)}, ${sqlEscape(project.description_nl)},
    ${sqlEscape(project.location_en)}, ${sqlEscape(project.location_nl)},
    NULL, 0, ${sqlEscape(project.thumb_image_id)},
    ${sqlEscape(project.tags)}, ${sqlEscape(project.social_links)}, ${sqlEscape(project.status)},
    datetime('now'), datetime('now')
  );`;
}

function imageToSql(image) {
  return `INSERT OR REPLACE INTO project_images (id, project_id, cloudflare_id, sort_order, caption, type)
VALUES (${sqlEscape(image.id)}, ${sqlEscape(image.project_id)}, ${sqlEscape(image.cloudflare_id)}, ${image.sort_order}, ${sqlEscape(image.caption)}, 'web');`;
}

function runWrangler(sqlFile, isRemote) {
  return new Promise((resolve, reject) => {
    const args = ["d1", "execute", "sintlucasmasters", isRemote ? "--remote" : "--local", "--file", sqlFile];
    console.log(`Running: wrangler ${args.join(" ")}`);

    const child = spawn("npx", ["wrangler", ...args], {
      stdio: "inherit",
      cwd: PROJECT_ROOT,
    });

    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`wrangler exited with code ${code}`));
    });

    child.on("error", reject);
  });
}

async function importData() {
  const args = process.argv.slice(2);
  const isRemote = args.includes("--remote");
  const isLocal = args.includes("--local");
  const isReset = args.includes("--reset");

  if (!isRemote && !isLocal) {
    console.error("Usage: node scripts/import-to-d1.mjs --local|--remote [--reset]");
    process.exit(1);
  }

  console.log(
    `${isReset ? "Resetting and importing" : "Importing"} to ${isRemote ? "REMOTE (production)" : "LOCAL"} D1 database...\n`
  );

  const allProjects = [];
  const allImages = [];
  const errors = [];
  const ignoredLegacyFiles = [];

  for (const year of YEARS) {
    const studentsDir = join(PROJECT_ROOT, "old", year, "students");

    let files = [];
    try {
      files = await readdir(studentsDir);
    } catch (err) {
      errors.push(`Could not read ${studentsDir}: ${err.message}`);
      continue;
    }

    const mdFiles = files.filter((f) => f.endsWith(".md") && f !== "students.json");
    const groups = new Map();

    for (const file of mdFiles) {
      const info = filenameInfo(file);
      if (!info) {
        // Legacy unsuffixed files can coexist with bilingual files; ignore these.
        ignoredLegacyFiles.push(`${year}/${file}`);
        continue;
      }

      if (!groups.has(info.base)) {
        groups.set(info.base, {});
      }

      const group = groups.get(info.base);
      if (group[info.lang]) {
        errors.push(`${year}/${file}: Duplicate language file for base '${info.base}'`);
        continue;
      }

      group[info.lang] = file;
    }

    for (const [base, group] of groups.entries()) {
      if (!group.en || !group.nl) {
        errors.push(`${year}/${base}: Missing language pair (need both _en and _nl)`);
        continue;
      }

      try {
        const enParsed = await parseLangFile(join(studentsDir, group.en), "en");
        const nlParsed = await parseLangFile(join(studentsDir, group.nl), "nl");
        const merged = mergeProjectPair(enParsed, nlParsed, year, base);

        if (merged.errors.length > 0) {
          errors.push(...merged.errors);
          continue;
        }

        if (!merged.project) {
          errors.push(`${year}/${base}: Failed to merge project`);
          continue;
        }

        if (merged.images.length === 0) {
          errors.push(`${year}/${base}: Missing images`);
          continue;
        }

        allProjects.push(merged.project);
        allImages.push(...merged.images);
      } catch (err) {
        errors.push(`${year}/${base}: ${err.message}`);
      }
    }
  }

  console.log("=== Import Summary ===");
  console.log(`Total projects: ${allProjects.length}`);
  console.log(`Total images: ${allImages.length}`);
  if (ignoredLegacyFiles.length > 0) {
    console.log(`Ignored legacy files: ${ignoredLegacyFiles.length}`);
  }
  console.log(`Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log("\nImport blocked due to data errors:");
    for (const err of errors) {
      console.log(`  - ${err}`);
    }
    process.exit(1);
  }

  const sqlLines = [
    "-- Sint Lucas Masters Import",
    `-- Generated: ${new Date().toISOString()}`,
    `-- Projects: ${allProjects.length}`,
    `-- Images: ${allImages.length}`,
    "",
  ];

  if (isReset) {
    sqlLines.push("-- Reset tables");
    sqlLines.push("DELETE FROM project_images;");
    sqlLines.push("DELETE FROM projects;");
    sqlLines.push("");
  }

  sqlLines.push("-- Projects");
  for (const project of allProjects) {
    sqlLines.push(projectToSql(project));
  }

  sqlLines.push("");
  sqlLines.push("-- Project Images");
  for (const image of allImages) {
    sqlLines.push(imageToSql(image));
  }

  const sqlFile = join(PROJECT_ROOT, ".import-temp.sql");
  await writeFile(sqlFile, sqlLines.join("\n"), "utf-8");

  console.log("\nExecuting import...\n");
  try {
    await runWrangler(sqlFile, isRemote);
    console.log("\nImport completed successfully!");
  } finally {
    await unlink(sqlFile).catch(() => {});
  }
}

importData().catch((err) => {
  console.error("Import failed:", err.message);
  process.exit(1);
});
