// Cloudflare Worker bindings
export type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
  APP_BASE_URL: string;
  SES_CONFIGURATION_SET: string;
  ASSETS: Fetcher;
  // AWS SES credentials
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION: string;
  // Cloudflare Images
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_API_TOKEN: string;
  // Cloudflare R2
  FILES: R2Bucket;
  // E2E testing
  E2E_SKIP_AUTH?: string;
  // Local development
  DEV_ADMIN_EMAIL?: string;
};

export type UserRole = "student" | "editor" | "admin";

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  created_at: string;
  last_login_at: string | null;
}

export interface Project {
  id: string;
  slug: string;
  student_name: string;
  sort_name: string;
  project_title: string;
  context: string;
  academic_year: string;
  bio: string | null;
  description: string;
  location: string | null;
  private_email: string | null;
  main_image_id: string | null;
  thumb_image_id: string | null;
  tags: string | null;
  social_links: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string | null;
}

export type ProjectImageType = "web" | "print";

export interface ProjectImage {
  id: string;
  project_id: string;
  cloudflare_id: string;
  sort_order: number;
  caption: string | null;
  type: ProjectImageType;
}

export const CONTEXTS = [
  "Autonomous Context",
  "Applied Context",
  "Digital Context",
  "Socio-Political Context",
  "Jewelry Context",
] as const;

export type Context = (typeof CONTEXTS)[number];

// Cloudflare Images URL helper
const CF_ACCOUNT_HASH = "7-GLn6-56OyK7JwwGe0hfg";

// Available variants:
// - thumb: 600x600 (grid cards)
// - medium: 1000w (gallery)
// - large: 1600w (detail hero)
// - xl: 2000x2000 (print/full)
// Note: 'public' and 'private' variants are NOT publicly accessible
export type ImageVariant = "thumb" | "medium" | "large" | "xl";

export function getImageUrl(imageId: string | null | undefined, variant: ImageVariant = "medium"): string | undefined {
  if (!imageId) return undefined;
  return `https://imagedelivery.net/${CF_ACCOUNT_HASH}/${imageId}/${variant}`;
}

// Generate student URL from project
export function getStudentUrl(project: Project): string {
  return `/${project.academic_year}/students/${project.slug}/`;
}
