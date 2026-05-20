// React mirror of src/lib/inline-markup.tsx. The admin app can't import from
// src/ (separate Vite build), so the parser is duplicated here. Keep the
// grammar in lockstep with the backend module — postcard text and admin
// previews are populated from the same DB column.

type InlineSegment = { kind: "text"; value: string; bold: boolean; italic: boolean } | { kind: "break" };

function parseInlineMarkup(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const lines = text.split("\n");
  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) segments.push({ kind: "break" });
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

export function FormattedText({ text }: { text: string | null | undefined }) {
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
}
