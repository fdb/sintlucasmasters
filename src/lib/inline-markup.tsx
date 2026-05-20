import type { FC } from "hono/jsx";

// Inline markup shared by the postcard IDML exporter and the public site /
// admin renderers. Convention is intentionally tiny:
//   *bold*    → bold run
//   _italic_  → italic run
//   \n        → hard line break
// No nesting, no escaping — an unmatched marker stays literal. Keeping the
// grammar this strict means students can type asterisks and underscores in
// regular prose (apostrophes, file paths, casual emphasis) without surprises.

export type InlineSegment = { kind: "text"; value: string; bold: boolean; italic: boolean } | { kind: "break" };

export function parseInlineMarkup(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
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

// Hono JSX renderer for the public site. The admin app cannot import from
// src/, so it carries its own React mirror in admin/src/components/.
export const FormattedText: FC<{ text: string | null | undefined }> = ({ text }) => {
  if (!text) return null;
  const segments = parseInlineMarkup(text);
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.kind === "break") return <br key={i} />;
        if (seg.bold) return <strong key={i}>{seg.value}</strong>;
        if (seg.italic) return <em key={i}>{seg.value}</em>;
        return <span key={i}>{seg.value}</span>;
      })}
    </>
  );
};
