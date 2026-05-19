/**
 * IDML Generator
 *
 * Takes a template IDML (as Uint8Array) and an array of student data,
 * produces a multi-page IDML with one spread per student.
 *
 * The template must contain exactly one spread and its associated stories,
 * with placeholder tokens (e.g. {{student_name}}) in the story XML.
 */

import { unzipSync, zipSync } from "fflate";

// ── Types ────────────────────────────────────────────────────────────

export interface PostcardTextData {
  student_name: string;
  trajectory: string;
  title: string;
  description: string;
  website: string;
  instagram: string;
}

export interface PostcardImageData {
  image_uri: string;
  image_filename: string;
  portrait: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────

function decode(buf: Uint8Array): string {
  return new TextDecoder().decode(buf);
}

function encode(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function xmlEscape(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── Description inline markup ─────────────────────────────────────────
//
// IDML has no inline emphasis tags: mixed formatting is expressed as a
// sequence of sibling <CharacterStyleRange> elements, each with an optional
// FontStyle override. The postcard body uses CharacterStyle/Tekst (font
// "Sequel Sans", default FontStyle "Book Body Text"); the bold/oblique
// variants below are already embedded in the template.

type MarkupSegment = { kind: "text"; value: string; bold: boolean; italic: boolean } | { kind: "break" };

/**
 * Parse the baseline postcard markup: `*bold*`, `_italic_`, and newlines as
 * line breaks. No nesting, no escaping — an unmatched marker stays literal.
 */
function parseInlineMarkup(text: string): MarkupSegment[] {
  const segments: MarkupSegment[] = [];
  const lines = text.split("\n");
  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) segments.push({ kind: "break" });
    // split() with one capturing group alternates: even index = plain text,
    // odd index = a matched *bold* / _italic_ token.
    const parts = line.split(/(\*[^*\n]+\*|_[^_\n]+_)/);
    parts.forEach((part, i) => {
      if (part === "") return;
      if (i % 2 === 1) {
        const bold = part[0] === "*";
        segments.push({ kind: "text", value: part.slice(1, -1), bold, italic: !bold });
      } else {
        segments.push({ kind: "text", value: part, bold: false, italic: false });
      }
    });
  });
  return segments;
}

const TEKST_RANGE_OPEN =
  '<CharacterStyleRange AppliedCharacterStyle="CharacterStyle/Tekst" AppliedLanguage="$ID/English: UK"';

function fontStyleAttr(bold: boolean, italic: boolean): string {
  if (bold && italic) return ' FontStyle="Bold Oblique Body Text"';
  if (bold) return ' FontStyle="Bold Body Text"';
  if (italic) return ' FontStyle="Book Oblique Body Text"';
  return "";
}

/**
 * Render a postcard description as a sequence of IDML CharacterStyleRange
 * runs. Plain text with no markup yields a single run identical to the old
 * raw-substitution behaviour.
 */
export function renderDescriptionRuns(description: string): string {
  const runs: string[] = [];
  for (const seg of parseInlineMarkup(description)) {
    if (seg.kind === "break") {
      runs.push(`${TEKST_RANGE_OPEN}><Br /></CharacterStyleRange>`);
    } else if (seg.value.length > 0) {
      runs.push(
        `${TEKST_RANGE_OPEN}${fontStyleAttr(seg.bold, seg.italic)}><Content>${xmlEscape(
          seg.value
        )}</Content></CharacterStyleRange>`
      );
    }
  }
  if (runs.length === 0) {
    runs.push(`${TEKST_RANGE_OPEN}><Content></Content></CharacterStyleRange>`);
  }
  return runs.join("");
}

let idCounter = 0xd000;

function nextId(): string {
  return "u" + (idCounter++).toString(16);
}

function resetIdCounter(start = 0xd000): void {
  idCounter = start;
}

// ── Template Analysis ────────────────────────────────────────────────

interface DesignmapInfo {
  spreadFile: string | undefined;
  storyFiles: { path: string; id: string }[];
  storyIds: string[];
}

function parseDesignmap(xml: string): DesignmapInfo {
  const spreadMatch = xml.match(/<idPkg:Spread src="(Spreads\/Spread_[^"]+\.xml)"/);

  const storyFiles: { path: string; id: string }[] = [];
  const storyRe = /<idPkg:Story src="(Stories\/Story_([^"]+)\.xml)"/g;
  let m;
  while ((m = storyRe.exec(xml)) !== null) {
    storyFiles.push({ path: m[1], id: m[2] });
  }

  const storyListMatch = xml.match(/StoryList="([^"]*)"/);
  const storyIds = storyListMatch?.[1].split(/\s+/).filter(Boolean) || [];

  return { spreadFile: spreadMatch?.[1], storyFiles, storyIds };
}

interface SpreadInfo {
  spreadId: string;
  pageId: string;
  frames: { frameId: string; storyId: string }[];
}

function parseSpread(xml: string): SpreadInfo {
  const selfMatch = xml.match(/<Spread Self="([^"]+)"/);
  const pageMatch = xml.match(/<Page Self="([^"]+)"/);

  const frames: { frameId: string; storyId: string }[] = [];
  const frameRe = /<TextFrame Self="([^"]+)"[^>]*ParentStory="([^"]+)"/g;
  let m;
  while ((m = frameRe.exec(xml)) !== null) {
    frames.push({ frameId: m[1], storyId: m[2] });
  }

  return {
    spreadId: selfMatch?.[1] ?? "",
    pageId: pageMatch?.[1] ?? "",
    frames,
  };
}

// ── ID Replacement ───────────────────────────────────────────────────

function reIdXml(
  xml: string,
  existingIdMap: Record<string, string> = {}
): { newXml: string; idMap: Record<string, string> } {
  const idMap: Record<string, string> = { ...existingIdMap };

  const selfRe = /Self="([^"]+)"/g;
  const selfIds = new Set<string>();
  let m;
  while ((m = selfRe.exec(xml)) !== null) {
    selfIds.add(m[1]);
  }

  for (const oldId of selfIds) {
    if (/^u[0-9a-f]+$/i.test(oldId) && !idMap[oldId]) {
      idMap[oldId] = nextId();
    }
  }

  for (const oldId of selfIds) {
    if (oldId.startsWith("di") && !idMap[oldId]) {
      idMap[oldId] = "di" + (idCounter++).toString(16);
    }
  }

  let newXml = xml;
  for (const [oldId, newId] of Object.entries(idMap)) {
    newXml = newXml.split(`"${oldId}"`).join(`"${newId}"`);
    newXml = newXml.split(` ${oldId} `).join(` ${newId} `);
    newXml = newXml.split(`"${oldId} `).join(`"${newId} `);
    newXml = newXml.split(` ${oldId}"`).join(` ${newId}"`);
  }

  return { newXml, idMap };
}

// ── Shared generation logic ──────────────────────────────────────────

const PAGE_HEIGHT = 297.6377952755906;
const SPREAD_OFFSET = PAGE_HEIGHT + 191.33858267716537;

interface SpreadEntry {
  filename: string;
  xml: string;
}

interface StoryEntry {
  filename: string;
  xml: string;
  id: string;
}

function cloneSpreadAndStories(
  templateSpreadXml: string,
  spreadInfo: SpreadInfo,
  storyMap: Record<string, { path: string; xml: string }>,
  index: number,
  replacePlaceholders: (storyXml: string, storyId: string) => string
): {
  spreadEntry: SpreadEntry;
  storyEntries: StoryEntry[];
  spreadIdMap: Record<string, string>;
} {
  // Pre-generate new IDs for stories so ParentStory refs get updated
  const storyIdSeed: Record<string, string> = {};
  for (const frame of spreadInfo.frames) {
    if (storyMap[frame.storyId]) {
      storyIdSeed[frame.storyId] = nextId();
    }
  }

  let spreadClone = templateSpreadXml;
  const { newXml: reidSpread, idMap: spreadIdMap } = reIdXml(spreadClone, storyIdSeed);
  spreadClone = reidSpread;

  // Update vertical position
  const yOffset = SPREAD_OFFSET * index;
  spreadClone = spreadClone.replace(
    /(<Spread[^>]*ItemTransform="1 0 0 1 )([0-9.-]+) ([0-9.-]+)(")/,
    (_, prefix, x, _y, suffix) => `${prefix}${x} ${yOffset}${suffix}`
  );

  // Update page number
  const pageNum = index + 1;
  spreadClone = spreadClone.replace(/(<Page[^>]*) Name="[^"]*"/, `$1 Name="${pageNum}"`);
  spreadClone = spreadClone.replace(
    /(<ListItem type="long">)\d+(<\/ListItem>\s*<ListItem type="long">)\d+(<\/ListItem>)/,
    `$1${pageNum}$2${pageNum}$3`
  );

  const storyEntries: StoryEntry[] = [];
  for (const frame of spreadInfo.frames) {
    const storyData = storyMap[frame.storyId];
    if (!storyData) continue;

    const newStoryId = spreadIdMap[frame.storyId];
    let storyClone = storyData.xml;
    const { newXml: reidStory } = reIdXml(storyClone, {
      [frame.storyId]: newStoryId,
    });
    storyClone = reidStory;

    storyClone = replacePlaceholders(storyClone, frame.storyId);

    storyEntries.push({
      filename: `Stories/Story_${newStoryId}.xml`,
      xml: storyClone,
      id: newStoryId,
    });
  }

  const newSpreadId = spreadIdMap[spreadInfo.spreadId] || nextId();
  return {
    spreadEntry: {
      filename: `Spreads/Spread_${newSpreadId}.xml`,
      xml: spreadClone,
    },
    storyEntries,
    spreadIdMap,
  };
}

function buildOutput(
  files: Record<string, Uint8Array>,
  designmap: string,
  spreadFile: string,
  storyFiles: { path: string; id: string }[],
  storyMap: Record<string, { path: string; xml: string }>,
  newSpreadEntries: SpreadEntry[],
  newStoryEntries: StoryEntry[],
  allNewStoryIds: string[],
  count: number
): Uint8Array {
  let newDesignmap = designmap;

  // Master story IDs (stories not in our template spread)
  const masterStoryIds: string[] = [];
  for (const { id } of storyFiles) {
    if (!(id in storyMap)) {
      masterStoryIds.push(id);
    }
  }

  // Update StoryList
  const allStoryIds = [...masterStoryIds, ...allNewStoryIds];
  newDesignmap = newDesignmap.replace(/StoryList="[^"]*"/, `StoryList="${allStoryIds.join(" ")}"`);

  // Replace spread references
  const spreadRefTag = `\t<idPkg:Spread src="${spreadFile}" />`;
  const newSpreadRefs = newSpreadEntries.map((s) => `\t<idPkg:Spread src="${s.filename}" />`).join("\n");
  newDesignmap = newDesignmap.replace(spreadRefTag, newSpreadRefs);

  // Remove template story references
  for (const storyId of Object.keys(storyMap)) {
    const storyRef = `\t<idPkg:Story src="Stories/Story_${storyId}.xml" />`;
    newDesignmap = newDesignmap.replace(storyRef + "\n", "");
    newDesignmap = newDesignmap.replace(storyRef, "");
  }

  // Add new story references
  const newStoryRefs = newStoryEntries.map((s) => `\t<idPkg:Story src="${s.filename}" />`).join("\n");
  const lastStoryIdx = newDesignmap.lastIndexOf("<idPkg:Story ");
  if (lastStoryIdx >= 0) {
    const insertPos = newDesignmap.indexOf("\n", lastStoryIdx) + 1;
    newDesignmap = newDesignmap.slice(0, insertPos) + newStoryRefs + "\n" + newDesignmap.slice(insertPos);
  } else {
    newDesignmap = newDesignmap.replace("</Document>", newStoryRefs + "\n</Document>");
  }

  // Update section length
  newDesignmap = newDesignmap.replace(/(<Section[^>]*) Length="\d+"/, `$1 Length="${count}"`);
  newDesignmap = newDesignmap.replace(
    /(<Section[^>]*) AlternateLayoutLength="\d+"/,
    `$1 AlternateLayoutLength="${count}"`
  );

  // Update PageStart
  if (newSpreadEntries.length > 0) {
    const firstPageMatch = newSpreadEntries[0].xml.match(/<Page Self="([^"]+)"/);
    if (firstPageMatch) {
      newDesignmap = newDesignmap.replace(/PageStart="[^"]*"/, `PageStart="${firstPageMatch[1]}"`);
    }
  }

  // Build output file set
  const outputFiles: Record<string, Uint8Array> = {};
  for (const [path, data] of Object.entries(files)) {
    if (path.startsWith("Spreads/") || path.startsWith("Stories/") || path === "designmap.xml") continue;
    outputFiles[path] = data;
  }

  for (const id of masterStoryIds) {
    const path = `Stories/Story_${id}.xml`;
    if (files[path]) outputFiles[path] = files[path];
  }

  for (const entry of newSpreadEntries) {
    outputFiles[entry.filename] = encode(entry.xml);
  }
  for (const entry of newStoryEntries) {
    outputFiles[entry.filename] = encode(entry.xml);
  }

  outputFiles["designmap.xml"] = encode(newDesignmap);

  // Re-zip with mimetype first and uncompressed (IDML spec requirement)
  const mimetypeContent = outputFiles["mimetype"];
  const rest: Record<string, Uint8Array> = {};
  for (const [k, v] of Object.entries(outputFiles)) {
    if (k === "mimetype") continue;
    rest[k] = v;
  }

  return zipSync({ mimetype: [mimetypeContent, { level: 0 }], ...rest }, { level: 6 });
}

// ── Portrait rotation ────────────────────────────────────────────────

/**
 * Rotate an Image element's ItemTransform 90° CCW for portrait images.
 *
 * IDML's ItemTransform "a b c d tx ty" represents the affine matrix:
 *   | a  c  tx |
 *   | b  d  ty |
 *   | 0  0  1  |
 *
 * To rotate the image content 90° CCW (portrait → landscape), we compose
 * the existing transform M with a rotation-and-shift matrix R:
 *   R = | 0  -1  H |    where H = image height in the SAME coordinate
 *       | 1   0  0 |        space as the existing translation, i.e. the
 *       | 0   0  1 |        Image's own <GraphicBounds> (Bottom − Top).
 *
 * Result M×R: new_a=c, new_b=d, new_c=-a, new_d=-b,
 *             new_tx = a*H + tx, new_ty = b*H + ty
 *
 * Using a DB pixel height here is the original regression that translated
 * portrait images onto the pasteboard (tx ≈ 1652 instead of ≈ 90).
 */
function rotateImageTransform90CCW(spreadXml: string): string {
  return spreadXml.replace(/<Image\b[^>]*>[\s\S]*?<\/Image>/, (imageBlock) => {
    const transformMatch = imageBlock.match(/ItemTransform="([^"]+)"/);
    const boundsMatch = imageBlock.match(/<GraphicBounds\b[^/]*Top="([-\d.]+)"[^/]*Bottom="([-\d.]+)"[^/]*\/>/);
    if (!transformMatch || !boundsMatch) return imageBlock;

    const parts = transformMatch[1].split(/\s+/).map(Number);
    if (parts.length !== 6 || parts.some(isNaN)) return imageBlock;

    const [a, b, c, d, tx, ty] = parts;
    const H = Number(boundsMatch[2]) - Number(boundsMatch[1]);
    if (!isFinite(H)) return imageBlock;

    const newTransform = `${c} ${d} ${-a} ${-b} ${a * H + tx} ${b * H + ty}`;
    return imageBlock.replace(/ItemTransform="[^"]+"/, `ItemTransform="${newTransform}"`);
  });
}

// ── Public API ───────────────────────────────────────────────────────

export function generateTextIdml(templateZip: Uint8Array, students: PostcardTextData[]): Uint8Array {
  resetIdCounter();
  const files = unzipSync(templateZip);
  const designmap = decode(files["designmap.xml"]);
  const { spreadFile, storyFiles } = parseDesignmap(designmap);

  if (!spreadFile) throw new Error("No spread found in template");

  const templateSpreadXml = decode(files[spreadFile]);
  const spreadInfo = parseSpread(templateSpreadXml);

  const storyMap: Record<string, { path: string; xml: string }> = {};
  for (const { path, id } of storyFiles) {
    if (spreadInfo.frames.some((f) => f.storyId === id)) {
      storyMap[id] = { path, xml: decode(files[path]) };
    }
  }

  const newSpreadEntries: SpreadEntry[] = [];
  const newStoryEntries: StoryEntry[] = [];
  const allNewStoryIds: string[] = [];

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const { spreadEntry, storyEntries } = cloneSpreadAndStories(
      templateSpreadXml,
      spreadInfo,
      storyMap,
      i,
      (storyXml) => {
        let s = storyXml;
        s = s.replace("{{student_name}}", xmlEscape(student.student_name));
        s = s.replace("{{trajectory}}", xmlEscape(student.trajectory));
        s = s.replace("{{title}}", xmlEscape(student.title));
        // The description supports baseline markup, so replace the whole
        // enclosing CharacterStyleRange (dropping its XMLElement wrapper)
        // with one run per formatting span. Matched structurally because
        // reIdXml has already rewritten the Self ids by this point. A
        // replacer function avoids `$` in user text being treated as a
        // replacement pattern.
        s = s.replace(
          /<CharacterStyleRange\b[^>]*>\s*<XMLElement\b[^>]*>\s*<Content>\{\{description\}\}<\/Content>\s*(?:<XMLAttribute\b[^>]*\/>\s*)*<\/XMLElement>\s*<\/CharacterStyleRange>/,
          () => renderDescriptionRuns(student.description)
        );
        s = s.replace("{{website}}", xmlEscape(student.website));
        s = s.replace("{{instagram}}", xmlEscape(student.instagram));
        return s;
      }
    );

    newSpreadEntries.push(spreadEntry);
    for (const se of storyEntries) {
      newStoryEntries.push(se);
      allNewStoryIds.push(se.id);
    }
  }

  return buildOutput(
    files,
    designmap,
    spreadFile,
    storyFiles,
    storyMap,
    newSpreadEntries,
    newStoryEntries,
    allNewStoryIds,
    students.length
  );
}

export function generateImageIdml(templateZip: Uint8Array, students: PostcardImageData[]): Uint8Array {
  resetIdCounter();
  const files = unzipSync(templateZip);
  const designmap = decode(files["designmap.xml"]);
  const { spreadFile, storyFiles } = parseDesignmap(designmap);

  if (!spreadFile) throw new Error("No spread found in template");

  const templateSpreadXml = decode(files[spreadFile]);
  const spreadInfo = parseSpread(templateSpreadXml);

  const storyMap: Record<string, { path: string; xml: string }> = {};
  for (const { path, id } of storyFiles) {
    if (spreadInfo.frames.some((f) => f.storyId === id)) {
      storyMap[id] = { path, xml: decode(files[path]) };
    }
  }

  const newSpreadEntries: SpreadEntry[] = [];
  const newStoryEntries: StoryEntry[] = [];
  const allNewStoryIds: string[] = [];

  for (let i = 0; i < students.length; i++) {
    const student = students[i];

    // Image URI replacement happens in the spread XML, not stories
    let modifiedSpreadXml = templateSpreadXml.replace("{{image_uri}}", student.image_uri);

    // For portrait images, rotate the Image element 90° CCW so it displays in landscape
    if (student.portrait) {
      modifiedSpreadXml = rotateImageTransform90CCW(modifiedSpreadXml);
    }

    const { spreadEntry, storyEntries } = cloneSpreadAndStories(
      modifiedSpreadXml,
      spreadInfo,
      storyMap,
      i,
      (storyXml) => {
        return storyXml.replace("{{image_filename}}", xmlEscape(student.image_filename));
      }
    );

    newSpreadEntries.push(spreadEntry);
    for (const se of storyEntries) {
      newStoryEntries.push(se);
      allNewStoryIds.push(se.id);
    }
  }

  return buildOutput(
    files,
    designmap,
    spreadFile,
    storyFiles,
    storyMap,
    newSpreadEntries,
    newStoryEntries,
    allNewStoryIds,
    students.length
  );
}
