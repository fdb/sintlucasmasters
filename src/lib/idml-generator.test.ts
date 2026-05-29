// @ts-nocheck — this project is typed for Cloudflare Workers only (no
// @types/node), so node:fs/node:path have no type declarations. Test files
// are never shipped to the Worker; Vitest runs in Node so they work at
// runtime, and the runtime assertions below are what guard this code.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { unzipSync } from "fflate";
import {
  renderDescriptionRuns,
  generateTextIdml,
  generateImageIdml,
  type PostcardTextData,
  type PostcardImageData,
} from "./idml-generator";

const TEKST = 'AppliedCharacterStyle="CharacterStyle/Tekst"';

describe("renderDescriptionRuns", () => {
  it("emits a single plain run for text with no markup", () => {
    const out = renderDescriptionRuns("Just plain text");
    expect(out).toBe(
      `<CharacterStyleRange ${TEKST} AppliedLanguage="$ID/English: UK"><Content>Just plain text</Content></CharacterStyleRange>`
    );
  });

  it("renders _italic_ as the Book Oblique font style", () => {
    const out = renderDescriptionRuns("an _emphasised_ word");
    expect(out).toContain("<Content>an </Content>");
    expect(out).toContain('FontStyle="Book Oblique Body Text"><Content>emphasised</Content>');
    expect(out).toContain("<Content> word</Content>");
  });

  it("renders *bold* as the Bold font style", () => {
    const out = renderDescriptionRuns("a *strong* word");
    expect(out).toContain('FontStyle="Bold Body Text"><Content>strong</Content>');
  });

  it("handles multiple spans on one line", () => {
    const out = renderDescriptionRuns("plain *b* mid _i_ end");
    expect(out).toContain('FontStyle="Bold Body Text"><Content>b</Content>');
    expect(out).toContain('FontStyle="Book Oblique Body Text"><Content>i</Content>');
    expect(out).toContain("<Content> mid </Content>");
  });

  it("turns newlines into <Br /> runs", () => {
    const out = renderDescriptionRuns("first\nsecond");
    expect(out).toContain("<Content>first</Content>");
    expect(out).toContain("><Br /></CharacterStyleRange>");
    expect(out).toContain("<Content>second</Content>");
    // a blank line in between is preserved as two breaks
    expect(renderDescriptionRuns("a\n\nb").match(/<Br \/>/g)).toHaveLength(2);
  });

  it("leaves an unmatched marker literal", () => {
    const out = renderDescriptionRuns("a lone * star and _ underscore");
    expect(out).toContain("<Content>a lone * star and _ underscore</Content>");
    expect(out).not.toContain("FontStyle");
  });

  it("xml-escapes special characters in every run", () => {
    const out = renderDescriptionRuns('Tom & *Jerry <co> "x"*');
    expect(out).toContain("Tom &amp; ");
    expect(out).toContain('FontStyle="Bold Body Text"><Content>Jerry &lt;co&gt; &quot;x&quot;</Content>');
  });

  it("emits a single empty run for a blank description", () => {
    expect(renderDescriptionRuns("")).toBe(
      `<CharacterStyleRange ${TEKST} AppliedLanguage="$ID/English: UK"><Content></Content></CharacterStyleRange>`
    );
  });
});

describe("generateTextIdml with markup", () => {
  const template = new Uint8Array(readFileSync(resolve(__dirname, "../../templates/postcard-text-template.idml")));

  const student: PostcardTextData = {
    student_name: "Ada Lovelace",
    trajectory: "MA",
    title: "A Title",
    description: "Plain, then _italic_ and *bold*.\nSecond paragraph.",
    website: "example.com",
    instagram: "@ada",
    email: "ada@example.com",
  };

  it("injects formatted runs into the description story and drops the wrapper", () => {
    const out = generateTextIdml(template, [student]);
    const files = unzipSync(out);
    const decoder = new TextDecoder();

    const storyXml = Object.entries(files)
      .filter(([name]) => name.startsWith("Stories/Story_"))
      .map(([, data]) => decoder.decode(data))
      .find((xml) => xml.includes("Plain, then "));

    expect(storyXml).toBeDefined();
    const xml = storyXml as string;

    expect(xml).not.toContain("{{description}}");
    expect(xml).not.toContain("Korte_inhoudelijke_omschrijving_van_je_project");
    expect(xml).toContain('FontStyle="Book Oblique Body Text"><Content>italic</Content>');
    expect(xml).toContain('FontStyle="Bold Body Text"><Content>bold</Content>');
    expect(xml).toContain("<Br />");
    expect(xml).toContain("<Content>Second paragraph.</Content>");
  });
});

describe("generateImageIdml portrait rotation", () => {
  // Regression: portrait images landed on the pasteboard (tx≈1652) because
  // rotateImageTransform90CCW used the DB pixel height (~1819) as its
  // rotation pivot. The pivot must be in the Image's own GraphicBounds
  // coordinate space (~297.6 pt) — that's the height that the existing
  // ItemTransform's translation is consistent with. Landscape images must
  // pass through unchanged.
  const template = new Uint8Array(readFileSync(resolve(__dirname, "../../templates/postcard-images-template.idml")));

  function imageTransformsOf(out: Uint8Array): string[] {
    const files = unzipSync(out);
    const decoder = new TextDecoder();
    return Object.entries(files)
      .filter(([name]) => name.startsWith("Spreads/"))
      .map(([, data]) => decoder.decode(data))
      .map((xml) => xml.match(/<Image\b[^>]*ItemTransform="([^"]+)"/)?.[1] ?? "")
      .filter(Boolean);
  }

  it("leaves landscape ItemTransform on the page (template values)", () => {
    const landscape: PostcardImageData = {
      image_uri: "file:a.jpg",
      image_filename: "a.jpg",
      portrait: false,
    };
    const [t] = imageTransformsOf(generateImageIdml(template, [landscape]));
    const tx = Number(t.split(/\s+/)[4]);
    expect(Math.abs(tx)).toBeLessThan(500);
  });

  it("rotates portrait images and keeps them on the page (not the pasteboard)", () => {
    const portrait: PostcardImageData = {
      image_uri: "file:b.jpg",
      image_filename: "b.jpg",
      portrait: true,
    };
    const [t] = imageTransformsOf(generateImageIdml(template, [portrait]));
    const [a, , , , tx] = t.split(/\s+/).map(Number);
    // 90° CCW rotation flips the leading scale entry to 0
    expect(a).toBe(0);
    // Pasteboard bug put tx ≈ 1652; on-page is ≈ 90
    expect(Math.abs(tx)).toBeLessThan(500);
  });
});
