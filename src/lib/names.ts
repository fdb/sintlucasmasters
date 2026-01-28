/**
 * Generate ASCII-normalized name for sorting.
 * Ensures names like "Çifel" sort with "C" names.
 */
export function sortName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .toLowerCase();
}

/**
 * Generate stable slug from email for upload paths.
 * bob.de.geest@student.kdg.be → "bob-de-geest"
 */
export function emailSlug(email: string): string {
  const localPart = email.split("@")[0];
  return localPart
    .toLowerCase()
    .replace(/\./g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
