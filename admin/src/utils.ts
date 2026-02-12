export function formatContext(value: unknown): string {
  if (value === null || value === undefined) return "—";
  const context = String(value).toLowerCase();
  const map: Record<string, string> = {
    autonomous: "Autonomous",
    applied: "Applied",
    digital: "Digital",
    sociopolitical: "Socio-Political",
    jewelry: "Jewelry",
  };
  return map[context] || String(value);
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

// =====================================================
// Print Image Validation
// =====================================================

// A6 postcard at 300dpi with 3mm bleed
// Portrait: 111mm × 154mm = 1311px × 1819px
// Landscape: 154mm × 111mm = 1819px × 1311px
const PRINT_MIN_WIDTH_PORTRAIT = 1311;
const PRINT_MIN_HEIGHT_PORTRAIT = 1819;
const PRINT_MIN_WIDTH_LANDSCAPE = 1819;
const PRINT_MIN_HEIGHT_LANDSCAPE = 1311;

export type PrintImageValidationResult = {
  valid: boolean;
  width: number;
  height: number;
  error?: string;
};

export async function validatePrintImageDimensions(file: File): Promise<PrintImageValidationResult> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const { width, height } = img;
      URL.revokeObjectURL(img.src);

      const isPortraitValid = width >= PRINT_MIN_WIDTH_PORTRAIT && height >= PRINT_MIN_HEIGHT_PORTRAIT;
      const isLandscapeValid = width >= PRINT_MIN_WIDTH_LANDSCAPE && height >= PRINT_MIN_HEIGHT_LANDSCAPE;

      if (isPortraitValid || isLandscapeValid) {
        resolve({ valid: true, width, height });
      } else {
        resolve({
          valid: false,
          width,
          height,
          error: `Image is ${width}×${height}px. Minimum required: ${PRINT_MIN_WIDTH_PORTRAIT}×${PRINT_MIN_HEIGHT_PORTRAIT}px (portrait) or ${PRINT_MIN_WIDTH_LANDSCAPE}×${PRINT_MIN_HEIGHT_LANDSCAPE}px (landscape)`,
        });
      }
    };
    img.onerror = () => resolve({ valid: false, width: 0, height: 0, error: "Could not load image" });
    img.src = URL.createObjectURL(file);
  });
}

export function isPrintImageSupported(file: File): boolean {
  return ["image/jpeg", "image/png"].includes(file.type);
}

export const PRINT_IMAGE_REQUIREMENTS = {
  minPortrait: { width: PRINT_MIN_WIDTH_PORTRAIT, height: PRINT_MIN_HEIGHT_PORTRAIT },
  minLandscape: { width: PRINT_MIN_WIDTH_LANDSCAPE, height: PRINT_MIN_HEIGHT_LANDSCAPE },
  description: "A6 postcard at 300dpi with 3mm bleed",
};
