export function formatContext(value: unknown): string {
  if (value === null || value === undefined) return "—";
  return String(value).replace(/ Context$/, "");
}

export function formatAcademicYear(value: unknown): string {
  if (value === null || value === undefined) return "—";
  const str = String(value);
  const match = str.match(/^(\d{4})-(\d{4})$/);
  if (match) {
    return `${match[1].slice(2)}-${match[2].slice(2)}`;
  }
  return str;
}

export function formatDate(value: unknown): string {
  if (!value || typeof value !== "string") return "—";
  try {
    const date = new Date(value);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(value);
  }
}
