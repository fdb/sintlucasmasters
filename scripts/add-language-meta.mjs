#!/usr/bin/env node

/**
 * Add language metadata to student project files.
 *
 * This script detects the language of each student markdown file, renames
 * files with a language suffix (_en or _nl), adds `lang` and `translated`
 * frontmatter fields, splits bilingual files, and creates translated variants.
 *
 * Usage:
 *   node scripts/add-language-meta.mjs --detect      # Dry-run: show detected languages
 *   node scripts/add-language-meta.mjs --apply        # Rename, split, add metadata
 *   node scripts/add-language-meta.mjs --translate     # Generate translated variants
 *   node scripts/add-language-meta.mjs --fix-titles    # Restore original titles in translated files
 */

import { readdir, readFile, writeFile, rename, unlink } from "fs/promises";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";
// Lazy-load Anthropic SDK and dotenv only when needed (for --detect, --apply, --translate)
async function createAnthropicClient() {
  await import("dotenv/config");
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  return new Anthropic();
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");

const YEARS = ["2021", "2022", "2023", "2024", "2025"];
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 500;

// Known bilingual files with their marker patterns
const BILINGUAL_FILES = {
  "alec-geluykens.md": {
    year: "2024",
    enMarker: null, // English section is first (before "—")
    nlMarker: "## Nederlands",
    separator: "—",
  },
  "antje-dupont.md": {
    year: "2025",
    enMarker: "Eng",
    nlMarker: /N\uFEFFl|^Nl$/m,
  },
  "emma-schelfhout.md": {
    year: "2025",
    enMarker: "Eng",
    nlMarker: /N\uFEFFl|^Nl$/m,
  },
  "nammu-eliaerts.md": {
    year: "2025",
    enMarker: "Eng",
    nlMarker: /^Nl$/m,
  },
};

/**
 * Read all student markdown files across all years.
 */
async function readAllStudentFiles() {
  const files = [];
  for (const year of YEARS) {
    const studentsDir = join(PROJECT_ROOT, "old", year, "students");
    let entries;
    try {
      entries = await readdir(studentsDir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.endsWith(".md") || entry === "students.json") continue;
      const filePath = join(studentsDir, entry);
      const content = await readFile(filePath, "utf-8");
      const { data: frontmatter, content: body } = matter(content);
      files.push({ year, filename: entry, filePath, frontmatter, body });
    }
  }
  return files;
}

/**
 * Serialize frontmatter + body back to markdown.
 */
function serializeMarkdown(frontmatter, body) {
  return matter.stringify(body, frontmatter);
}

/**
 * Split a known bilingual file into English and Dutch sections.
 */
function splitBilingualFile(filename, body) {
  const config = BILINGUAL_FILES[filename];
  if (!config) return null;

  let enText, nlText;

  if (filename === "alec-geluykens.md") {
    // Format: English text, then "—", then "## Nederlands", then Dutch text
    const sepIdx = body.indexOf("—");
    if (sepIdx === -1) return null;
    enText = body.substring(0, sepIdx).trim();
    const nlHeaderIdx = body.indexOf("## Nederlands", sepIdx);
    if (nlHeaderIdx === -1) {
      nlText = body.substring(sepIdx + 1).trim();
    } else {
      nlText = body.substring(nlHeaderIdx + "## Nederlands".length).trim();
    }
  } else {
    // Format: "Eng\n\n...English...\n\nNl\n\n...Dutch..."
    // Find the Eng marker
    const engIdx = body.indexOf("Eng");
    if (engIdx === -1) return null;

    // Find the Nl marker (may have zero-width char)
    let nlIdx;
    const nlMatch = body.match(/\nN\uFEFF?l\s*\n/);
    if (nlMatch) {
      nlIdx = nlMatch.index;
    } else {
      return null;
    }

    enText = body.substring(engIdx + "Eng".length, nlIdx).trim();
    nlText = body.substring(nlIdx + nlMatch[0].length).trim();
  }

  return { en: enText, nl: nlText };
}

/**
 * Detect language using Claude API.
 */
async function detectLanguage(client, text) {
  // Skip empty content
  if (!text || text.trim().length < 10) {
    return "en"; // default for very short/empty content
  }

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 50,
    messages: [
      {
        role: "user",
        content: `Determine the primary language of this text. Respond with ONLY a JSON object like {"lang": "nl"} or {"lang": "en"}. Only use "nl" for Dutch or "en" for English.\n\n${text.substring(0, 1500)}`,
      },
      {
        role: "assistant",
        content: '{"lang": "',
      },
    ],
  });

  const completion = '{"lang": "' + response.content[0].text;
  try {
    const parsed = JSON.parse(completion);
    if (parsed.lang === "nl" || parsed.lang === "en") {
      return parsed.lang;
    }
  } catch {
    // Try to extract from partial response
    if (completion.includes("nl")) return "nl";
    if (completion.includes("en")) return "en";
  }
  return "en"; // default
}

/**
 * Translate text using Claude API.
 */
async function translateText(client, text, fromLang, toLang) {
  if (!text || text.trim().length === 0) return "";

  const langNames = { en: "English", nl: "Dutch" };
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Translate the following text from ${langNames[fromLang]} to ${langNames[toLang]}. Return ONLY the translated text, no explanations or preamble.\n\n${text}`,
      },
    ],
  });

  return response.content[0].text.trim();
}

/**
 * Process items in batches with rate limiting.
 */
async function processBatches(items, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
    if (i + BATCH_SIZE < items.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
    process.stdout.write(
      `\r  Progress: ${Math.min(i + BATCH_SIZE, items.length)}/${items.length}`,
    );
  }
  process.stdout.write("\n");
  return results;
}

// ─── Commands ───────────────────────────────────────────────────────────

/**
 * --detect: Dry-run language detection report.
 */
async function commandDetect() {
  const client = await createAnthropicClient();
  const files = await readAllStudentFiles();
  console.log(`Found ${files.length} student files.\n`);

  // Identify bilingual files
  const bilingualEntries = files.filter(
    (f) => BILINGUAL_FILES[f.filename] && f.year === BILINGUAL_FILES[f.filename].year,
  );
  const monolingualEntries = files.filter(
    (f) => !BILINGUAL_FILES[f.filename] || f.year !== BILINGUAL_FILES[f.filename].year,
  );

  console.log(`Bilingual files (will be split): ${bilingualEntries.length}`);
  for (const f of bilingualEntries) {
    console.log(`  ${f.year}/${f.filename}`);
  }

  console.log(`\nDetecting language for ${monolingualEntries.length} files...`);

  const results = await processBatches(monolingualEntries, async (f) => {
    const textToCheck = f.body || f.frontmatter.bio || f.frontmatter.project_title || "";
    const lang = await detectLanguage(client, textToCheck);
    return { ...f, lang };
  });

  // Summary
  const langCounts = { en: 0, nl: 0 };
  for (const r of results) {
    langCounts[r.lang] = (langCounts[r.lang] || 0) + 1;
  }
  console.log("\n=== Detection Summary ===");
  console.log(`English: ${langCounts.en}`);
  console.log(`Dutch: ${langCounts.nl}`);
  console.log(`Bilingual (to split): ${bilingualEntries.length}`);

  // Per year
  console.log("\nBy year:");
  for (const year of YEARS) {
    const yearResults = results.filter((r) => r.year === year);
    const en = yearResults.filter((r) => r.lang === "en").length;
    const nl = yearResults.filter((r) => r.lang === "nl").length;
    const bi = bilingualEntries.filter((b) => b.year === year).length;
    console.log(`  ${year}: ${en} en, ${nl} nl, ${bi} bilingual`);
  }

  // List each file
  console.log("\nDetailed results:");
  for (const r of results) {
    console.log(`  [${r.lang}] ${r.year}/${r.filename}`);
  }
}

/**
 * --apply: Rename files, split bilingual files, add metadata.
 */
async function commandApply() {
  const client = await createAnthropicClient();
  const files = await readAllStudentFiles();

  // Check that files haven't already been processed
  const alreadyProcessed = files.some(
    (f) => f.filename.endsWith("_en.md") || f.filename.endsWith("_nl.md"),
  );
  if (alreadyProcessed) {
    console.error(
      "Error: Some files already have language suffixes. Run on unprocessed files only.",
    );
    process.exit(1);
  }

  console.log(`Processing ${files.length} files...\n`);

  // Step 1: Handle bilingual files (no API needed)
  console.log("Splitting bilingual files...");
  for (const f of files) {
    const biConfig = BILINGUAL_FILES[f.filename];
    if (!biConfig || f.year !== biConfig.year) continue;

    const split = splitBilingualFile(f.filename, f.body);
    if (!split) {
      console.error(`  Warning: Could not split ${f.filename}, skipping`);
      continue;
    }

    const baseName = f.filename.replace(".md", "");
    const dir = dirname(f.filePath);

    // Create English version
    const enFrontmatter = { ...f.frontmatter, lang: "en", translated: false };
    const enPath = join(dir, `${baseName}_en.md`);
    await writeFile(enPath, serializeMarkdown(enFrontmatter, split.en), "utf-8");

    // Create Dutch version
    const nlFrontmatter = { ...f.frontmatter, lang: "nl", translated: false };
    const nlPath = join(dir, `${baseName}_nl.md`);
    await writeFile(nlPath, serializeMarkdown(nlFrontmatter, split.nl), "utf-8");

    // Remove original
    await unlink(f.filePath);
    console.log(`  Split: ${f.filename} → ${baseName}_en.md + ${baseName}_nl.md`);
  }

  // Step 2: Detect language for all remaining files
  const monolingualFiles = files.filter(
    (f) => !BILINGUAL_FILES[f.filename] || f.year !== BILINGUAL_FILES[f.filename].year,
  );

  console.log(`\nDetecting language for ${monolingualFiles.length} files...`);

  const detected = await processBatches(monolingualFiles, async (f) => {
    const textToCheck = f.body || f.frontmatter.bio || f.frontmatter.project_title || "";
    const lang = await detectLanguage(client, textToCheck);
    return { ...f, lang };
  });

  // Step 3: Rename and update frontmatter
  console.log("\nRenaming and updating files...");
  let enCount = 0;
  let nlCount = 0;
  for (const f of detected) {
    const baseName = f.filename.replace(".md", "");
    const dir = dirname(f.filePath);
    const newFilename = `${baseName}_${f.lang}.md`;
    const newPath = join(dir, newFilename);

    // Update frontmatter
    const updatedFrontmatter = { ...f.frontmatter, lang: f.lang, translated: false };

    // Write updated file at new path
    await writeFile(newPath, serializeMarkdown(updatedFrontmatter, f.body), "utf-8");

    // Remove old file (if new path differs)
    if (newPath !== f.filePath) {
      await unlink(f.filePath);
    }

    if (f.lang === "en") enCount++;
    else nlCount++;
  }

  console.log(`\n=== Apply Summary ===`);
  console.log(`Bilingual files split: ${Object.keys(BILINGUAL_FILES).length}`);
  console.log(`English files: ${enCount}`);
  console.log(`Dutch files: ${nlCount}`);
  console.log(`Total renamed: ${detected.length}`);
}

/**
 * --translate: Generate translated variants for files missing a counterpart.
 */
async function commandTranslate() {
  const client = await createAnthropicClient();

  // Read all files (should now all have _en or _nl suffix)
  const allFiles = [];
  for (const year of YEARS) {
    const studentsDir = join(PROJECT_ROOT, "old", year, "students");
    let entries;
    try {
      entries = await readdir(studentsDir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.endsWith(".md") || entry === "students.json") continue;
      allFiles.push({ year, filename: entry, dir: studentsDir });
    }
  }

  // Group by base name
  const groups = new Map();
  for (const f of allFiles) {
    let baseName;
    if (f.filename.endsWith("_en.md")) {
      baseName = f.filename.replace("_en.md", "");
    } else if (f.filename.endsWith("_nl.md")) {
      baseName = f.filename.replace("_nl.md", "");
    } else {
      console.warn(`  Skipping unprocessed file: ${f.year}/${f.filename}`);
      continue;
    }
    const key = `${f.year}/${baseName}`;
    if (!groups.has(key)) groups.set(key, { year: f.year, baseName, dir: f.dir, files: {} });
    const lang = f.filename.endsWith("_en.md") ? "en" : "nl";
    groups.get(key).files[lang] = f.filename;
  }

  // Find files missing a counterpart
  const toTranslate = [];
  for (const [key, group] of groups) {
    if (group.files.en && group.files.nl) continue; // Both exist, skip
    const sourceLang = group.files.en ? "en" : "nl";
    const targetLang = sourceLang === "en" ? "nl" : "en";
    const sourceFile = join(group.dir, group.files[sourceLang]);
    toTranslate.push({ key, group, sourceLang, targetLang, sourceFile });
  }

  console.log(`Found ${groups.size} file groups.`);
  console.log(`Already have both languages: ${groups.size - toTranslate.length}`);
  console.log(`Need translation: ${toTranslate.length}\n`);

  if (toTranslate.length === 0) {
    console.log("Nothing to translate.");
    return;
  }

  console.log("Translating...");
  await processBatches(toTranslate, async (item) => {
    const content = await readFile(item.sourceFile, "utf-8");
    const { data: frontmatter, content: body } = matter(content);

    // Translate body
    const translatedBody = await translateText(client, body.trim(), item.sourceLang, item.targetLang);

    // Translate bio if present
    let translatedBio = frontmatter.bio || null;
    if (frontmatter.bio) {
      translatedBio = await translateText(client, frontmatter.bio, item.sourceLang, item.targetLang);
    }

    // Keep project_title as-is (artistic choice, should not be translated)
    const translatedTitle = frontmatter.project_title;

    // Build new frontmatter
    const newFrontmatter = {
      ...frontmatter,
      project_title: translatedTitle,
      lang: item.targetLang,
      translated: true,
    };
    if (translatedBio !== null) {
      newFrontmatter.bio = translatedBio;
    }

    // Write translated file
    const targetFilename = `${item.group.baseName}_${item.targetLang}.md`;
    const targetPath = join(item.group.dir, targetFilename);
    await writeFile(targetPath, serializeMarkdown(newFrontmatter, translatedBody), "utf-8");

    return { key: item.key, targetFilename };
  });

  console.log("\n=== Translation Summary ===");
  console.log(`Translated: ${toTranslate.length} files`);
}

/**
 * --fix-titles: Restore original project titles in translated files.
 *
 * For each student pair (_en + _nl), copies the project_title from the
 * original file (translated: false) to the translated file (translated: true).
 * This is a local-only operation — no API calls needed.
 */
async function commandFixTitles() {
  // Read all files grouped by base name
  const allFiles = [];
  for (const year of YEARS) {
    const studentsDir = join(PROJECT_ROOT, "old", year, "students");
    let entries;
    try {
      entries = await readdir(studentsDir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.endsWith(".md") || entry === "students.json") continue;
      allFiles.push({ year, filename: entry, dir: studentsDir });
    }
  }

  // Group by base name
  const groups = new Map();
  for (const f of allFiles) {
    let baseName;
    if (f.filename.endsWith("_en.md")) {
      baseName = f.filename.replace("_en.md", "");
    } else if (f.filename.endsWith("_nl.md")) {
      baseName = f.filename.replace("_nl.md", "");
    } else {
      continue;
    }
    const key = `${f.year}/${baseName}`;
    if (!groups.has(key)) groups.set(key, { year: f.year, baseName, dir: f.dir, files: {} });
    const lang = f.filename.endsWith("_en.md") ? "en" : "nl";
    groups.get(key).files[lang] = f.filename;
  }

  let fixedCount = 0;

  for (const [key, group] of groups) {
    // Need both files
    if (!group.files.en || !group.files.nl) continue;

    const enPath = join(group.dir, group.files.en);
    const nlPath = join(group.dir, group.files.nl);

    const enContent = await readFile(enPath, "utf-8");
    const nlContent = await readFile(nlPath, "utf-8");

    const enParsed = matter(enContent);
    const nlParsed = matter(nlContent);

    // Find which file is the original (translated: false) and which is translated
    let originalParsed, translatedParsed, translatedPath;
    if (enParsed.data.translated === true && nlParsed.data.translated === false) {
      originalParsed = nlParsed;
      translatedParsed = enParsed;
      translatedPath = enPath;
    } else if (nlParsed.data.translated === true && enParsed.data.translated === false) {
      originalParsed = enParsed;
      translatedParsed = nlParsed;
      translatedPath = nlPath;
    } else {
      // Both are originals or both are translated — skip
      continue;
    }

    const originalTitle = originalParsed.data.project_title;
    const translatedTitle = translatedParsed.data.project_title;

    if (originalTitle === translatedTitle) continue; // Already matches

    // Copy the original title to the translated file
    const updatedFrontmatter = { ...translatedParsed.data, project_title: originalTitle };
    await writeFile(translatedPath, serializeMarkdown(updatedFrontmatter, translatedParsed.content), "utf-8");
    fixedCount++;
    console.log(`  Fixed: ${key} — "${translatedTitle}" → "${originalTitle}"`);
  }

  console.log(`\n=== Fix Titles Summary ===`);
  console.log(`Total pairs checked: ${groups.size}`);
  console.log(`Titles fixed: ${fixedCount}`);
}

// ─── Main ───────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--detect")) {
    await commandDetect();
  } else if (args.includes("--apply")) {
    await commandApply();
  } else if (args.includes("--translate")) {
    await commandTranslate();
  } else if (args.includes("--fix-titles")) {
    await commandFixTitles();
  } else {
    console.log("Usage: node scripts/add-language-meta.mjs --detect|--apply|--translate|--fix-titles");
    console.log("");
    console.log("  --detect      Dry-run: detect languages and show report");
    console.log("  --apply       Rename files, split bilingual, add lang metadata");
    console.log("  --translate   Generate translated variants for missing counterparts");
    console.log("  --fix-titles  Restore original project titles in translated files");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
