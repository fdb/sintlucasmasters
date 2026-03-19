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
        s = s.replace("{{description}}", xmlEscape(student.description));
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
    const modifiedSpreadXml = templateSpreadXml.replace("{{image_uri}}", student.image_uri);

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
