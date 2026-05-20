import { describe, it, expect } from "vitest";
import { parseInlineMarkup } from "./inline-markup";

describe("parseInlineMarkup", () => {
  it("returns a single plain text segment when there is no markup", () => {
    expect(parseInlineMarkup("hello world")).toEqual([
      { kind: "text", value: "hello world", bold: false, italic: false },
    ]);
  });

  it("recognises _italic_", () => {
    expect(parseInlineMarkup("an _emphasised_ word")).toEqual([
      { kind: "text", value: "an ", bold: false, italic: false },
      { kind: "text", value: "emphasised", bold: false, italic: true },
      { kind: "text", value: " word", bold: false, italic: false },
    ]);
  });

  it("recognises *bold*", () => {
    expect(parseInlineMarkup("a *strong* word")).toEqual([
      { kind: "text", value: "a ", bold: false, italic: false },
      { kind: "text", value: "strong", bold: true, italic: false },
      { kind: "text", value: " word", bold: false, italic: false },
    ]);
  });

  it("emits a break for each newline and keeps both lines parsed", () => {
    expect(parseInlineMarkup("first _i_\nsecond")).toEqual([
      { kind: "text", value: "first ", bold: false, italic: false },
      { kind: "text", value: "i", bold: false, italic: true },
      { kind: "break" },
      { kind: "text", value: "second", bold: false, italic: false },
    ]);
  });

  it("leaves unmatched markers literal", () => {
    expect(parseInlineMarkup("a lone * star")).toEqual([
      { kind: "text", value: "a lone * star", bold: false, italic: false },
    ]);
  });
});
