/**
 * Generate ASCII-normalized name for sorting.
 * Ensures names like "Çifel" sort with "C" names.
 */
export function sortName(name: string): string {
	return name
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '') // Remove diacritics
		.toLowerCase();
}
