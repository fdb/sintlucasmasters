import { describe, expect, it } from "vitest";
import { normalizeSocialLink, normalizeSocialLinksValue } from "./socialLinks";

describe("normalizeSocialLink", () => {
  it.each([
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:x",
    "ftp://example.com",
  ])("drops non-web URL %s", (input) => {
    expect(normalizeSocialLink(input)).toBe("");
  });

  it.each([
    ["https://example.com/work", "https://example.com/work"],
    ["http://example.com", "http://example.com/"],
    ["example.com", "https://example.com/"],
    ["@studio.name", "https://www.instagram.com/studio.name"],
  ])("keeps web link %s", (input, expected) => {
    expect(normalizeSocialLink(input)).toBe(expected);
  });

  it("removes unsafe links from stored values", () => {
    expect(normalizeSocialLinksValue(["javascript:alert(1)", "https://example.com"])).toBe('["https://example.com/"]');
    expect(normalizeSocialLinksValue(["javascript:alert(1)"])).toBeNull();
  });
});
