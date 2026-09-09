export const SEARCH_FIELDS = [
  "student_name",
  "project_title_en",
  "project_title_nl",
  "description_en",
  "description_nl",
  "tags",
] as const;

/** Fold case and diacritics for matching; keep the original text for display. */
export function normalizeSearchText(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}
