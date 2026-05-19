// @ts-nocheck — this project is typed for Cloudflare Workers only (no
// @types/node), so node:fs/node:path have no type declarations. Test files
// are never shipped to the Worker; Vitest runs in Node so they work at
// runtime, and the runtime assertions below are what guard this code.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { unzipSync } from "fflate";
import { renderDescriptionRuns, generateTextIdml, type PostcardTextData } from "./idml-generator";

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
