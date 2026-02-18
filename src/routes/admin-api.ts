import { Hono } from "hono";
import type { Context } from "hono";
import Anthropic from "@anthropic-ai/sdk";
import { zipSync } from "fflate";
import type { Bindings, ContextKey, Project, ProjectImage, UserRole } from "../types";
import { authMiddleware, requireAuth, requireAdmin, type AuthUser } from "../middleware/auth";
import { STUDENT_EMAIL_DOMAIN, R2_PATH_PREFIX } from "../constants";
import { emailSlug } from "../lib/names";
import { normalizeSocialLinksValue } from "../lib/socialLinks";
import { normalizeContextKey } from "../lib/i18n";

type TableConfig = {
  select: string;
  orderBy?: string;
};

const TABLES: Record<string, TableConfig> = {
  projects: {
    select:
      "id, slug, student_name, sort_name, COALESCE(NULLIF(project_title_nl, ''), project_title_en) as project_title, context, academic_year, status, updated_at, user_id",
    orderBy: "updated_at DESC",
  },
  project_images: {
    select: "id, project_id, cloudflare_id, sort_order, caption, type",
    orderBy: "sort_order ASC, id ASC",
  },
  users: {
    select: "id, email, name, role, created_at, last_login_at",
    orderBy: "created_at DESC",
  },
};

const MAX_LIMIT = 1000;

// Fields that students are allowed to edit
const STUDENT_EDITABLE_FIELDS = [
  "student_name",
  "project_title_en",
  "project_title_nl",
  "bio_en",
  "bio_nl",
  "description_en",
  "description_nl",
  "location_en",
  "location_nl",
  "private_email",
  "alumni_consent",
  "social_links",
  "tags",
];

export const adminApiRoutes = new Hono<{ Bindings: Bindings }>();

// Apply auth middleware to all routes
adminApiRoutes.use("*", authMiddleware, requireAuth);

// =====================================================
// Permission Helpers
// =====================================================

function isAdminOrEditor(user: AuthUser | null): boolean {
  return user?.role === "admin" || user?.role === "editor";
}

async function checkProjectAccess(c: Context<{ Bindings: Bindings }>, projectId: string): Promise<Project | null> {
  const user = c.get("user");
  if (!user) return null;

  const project = await c.env.DB.prepare("SELECT * FROM projects WHERE id = ?").bind(projectId).first<Project>();

  if (!project) return null;

  // Admins/editors can access any project
  if (isAdminOrEditor(user)) return project;

  // Students can only access their own projects
  if (user.role === "student" && project.user_id === user.userId) return project;

  return null; // No access
}

function canStudentEdit(project: Project): { allowed: boolean; reason?: string } {
  // Students cannot edit projects with ready_for_print status
  if (project.status === "ready_for_print") {
    return {
      allowed: false,
      reason: "Project is locked for printing. Contact an administrator if changes are needed.",
    };
  }
  // Students CAN edit published projects
  return { allowed: true };
}

function filterStudentEditableFields(body: Record<string, unknown>, allowedFields: string[]): Record<string, unknown> {
  const filtered: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      filtered[field] = body[field];
    }
  }
  return filtered;
}

// =====================================================
// Admin-only routes (tables, users management)
// =====================================================

adminApiRoutes.get("/tables", (c) => {
  const user = c.get("user");
  if (!isAdminOrEditor(user)) {
    // Students only see projects table
    return c.json({ tables: ["projects"] });
  }
  return c.json({ tables: Object.keys(TABLES) });
});

adminApiRoutes.get("/table/:name", async (c) => {
  const user = c.get("user");
  const name = c.req.param("name");
  const config = TABLES[name];

  if (!config) {
    return c.json({ error: "Unknown table" }, 404);
  }

  // Students can only view projects table
  if (!isAdminOrEditor(user) && name !== "projects") {
    return c.json({ error: "Forbidden" }, 403);
  }

  const limitParam = c.req.query("limit");
  const limit = Math.min(Math.max(Number(limitParam) || 100, 1), MAX_LIMIT);

  const orderClause = config.orderBy ? ` ORDER BY ${config.orderBy}` : "";

  // For students viewing projects, filter to only their projects
  if (!isAdminOrEditor(user) && name === "projects") {
    const forUserId = c.req.query("forUserId");
    const userId = forUserId || user?.userId;
    const query = `SELECT ${config.select} FROM ${name} WHERE user_id = ?${orderClause} LIMIT ?`;
    const countQuery = `SELECT COUNT(*) as count FROM ${name} WHERE user_id = ?`;

    const { results } = await c.env.DB.prepare(query).bind(userId, limit).all();
    const countRow = await c.env.DB.prepare(countQuery).bind(userId).first<{ count: number }>();

    return c.json({
      table: name,
      limit,
      count: countRow?.count ?? 0,
      rows: results ?? [],
    });
  }

  const query = `SELECT ${config.select} FROM ${name}${orderClause} LIMIT ?`;
  const countQuery = `SELECT COUNT(*) as count FROM ${name}`;

  const { results } = await c.env.DB.prepare(query).bind(limit).all();
  const countRow = await c.env.DB.prepare(countQuery).first<{ count: number }>();

  return c.json({
    table: name,
    limit,
    count: countRow?.count ?? 0,
    rows: results ?? [],
  });
});

// =====================================================
// Project Routes (with permission checks)
// =====================================================

// Get my projects (for students)
adminApiRoutes.get("/projects/mine", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // For impersonation: admins/editors can pass forUserId
  const forUserId = c.req.query("forUserId");
  const userId = isAdminOrEditor(user) && forUserId ? forUserId : user.userId;

  const { results } = await c.env.DB.prepare(
    `SELECT id, slug, student_name, sort_name,
            COALESCE(NULLIF(project_title_nl, ''), project_title_en) as project_title,
            context, academic_year, status, updated_at, user_id
     FROM projects
     WHERE user_id = ?
     ORDER BY updated_at DESC`
  )
    .bind(userId)
    .all<Project>();

  return c.json({ projects: results ?? [] });
});

adminApiRoutes.get("/projects/:id", async (c) => {
  const id = c.req.param("id");
  const project = await checkProjectAccess(c, id);

  if (!project) {
    return c.json({ error: "Project not found or access denied" }, 404);
  }

  const { results: images } = await c.env.DB.prepare(
    "SELECT * FROM project_images WHERE project_id = ? ORDER BY sort_order ASC, id ASC"
  )
    .bind(id)
    .all<ProjectImage>();

  // Fetch user email if project has a user_id
  let userEmail: string | null = null;
  if (project.user_id) {
    const user = await c.env.DB.prepare("SELECT email FROM users WHERE id = ?")
      .bind(project.user_id)
      .first<{ email: string }>();
    userEmail = user?.email ?? null;
  }

  return c.json({
    project,
    images: images ?? [],
    userEmail,
  });
});

// Update project
adminApiRoutes.put("/projects/:id", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");
  const project = await checkProjectAccess(c, id);

  if (!project) {
    return c.json({ error: "Project not found or access denied" }, 404);
  }

  let body = await c.req.json<Record<string, unknown>>();

  // For students, check if editing is allowed and filter fields
  if (!isAdminOrEditor(user)) {
    const editCheck = canStudentEdit(project);
    if (!editCheck.allowed) {
      return c.json({ error: editCheck.reason }, 403);
    }
    body = filterStudentEditableFields(body, STUDENT_EDITABLE_FIELDS);
  }

  // Build update query dynamically
  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.student_name !== undefined) {
    updates.push("student_name = ?");
    values.push(body.student_name);
  }
  if (body.project_title_en !== undefined) {
    updates.push("project_title_en = ?");
    values.push(body.project_title_en);
  }
  if (body.project_title_nl !== undefined) {
    updates.push("project_title_nl = ?");
    values.push(body.project_title_nl);
  }
  if (body.context !== undefined) {
    const normalizedContext = normalizeContext(body.context);
    if (!normalizedContext) {
      return c.json({ error: "Invalid context" }, 400);
    }
    updates.push("context = ?");
    values.push(normalizedContext);
  }
  if (body.program !== undefined) {
    updates.push("program = ?");
    values.push(body.program);
  }
  if (body.academic_year !== undefined) {
    updates.push("academic_year = ?");
    values.push(body.academic_year);
  }
  if (body.bio_en !== undefined) {
    updates.push("bio_en = ?");
    values.push(body.bio_en);
  }
  if (body.bio_nl !== undefined) {
    updates.push("bio_nl = ?");
    values.push(body.bio_nl);
  }
  if (body.description_en !== undefined) {
    updates.push("description_en = ?");
    values.push(body.description_en);
  }
  if (body.description_nl !== undefined) {
    updates.push("description_nl = ?");
    values.push(body.description_nl);
  }
  if (body.location_en !== undefined) {
    updates.push("location_en = ?");
    values.push(body.location_en);
  }
  if (body.location_nl !== undefined) {
    updates.push("location_nl = ?");
    values.push(body.location_nl);
  }
  if (body.private_email !== undefined) {
    updates.push("private_email = ?");
    values.push(body.private_email);
  }
  if (body.alumni_consent !== undefined) {
    updates.push("alumni_consent = ?");
    values.push(body.alumni_consent);
  }
  if (body.status !== undefined) {
    updates.push("status = ?");
    values.push(body.status);
  }
  if (body.tags !== undefined) {
    updates.push("tags = ?");
    values.push(body.tags);
  }
  if (body.social_links !== undefined) {
    updates.push("social_links = ?");
    values.push(normalizeSocialLinksValue(body.social_links));
  }
  if (updates.length === 0) {
    return c.json({ error: "No fields to update" }, 400);
  }

  // Always update updated_at
  updates.push("updated_at = datetime('now')");

  const query = `UPDATE projects SET ${updates.join(", ")} WHERE id = ?`;
  values.push(id);

  await c.env.DB.prepare(query)
    .bind(...values)
    .run();

  // Return updated project
  const updatedProject = await c.env.DB.prepare("SELECT * FROM projects WHERE id = ?").bind(id).first<Project>();

  return c.json({ project: updatedProject });
});

// Reorder project images and update captions
adminApiRoutes.put("/projects/:id/images/reorder", async (c) => {
  const projectId = c.req.param("id");
  const user = c.get("user");
  const project = await checkProjectAccess(c, projectId);

  if (!project) {
    return c.json({ error: "Project not found or access denied" }, 404);
  }

  // Check edit permissions for students
  if (!isAdminOrEditor(user)) {
    const editCheck = canStudentEdit(project);
    if (!editCheck.allowed) {
      return c.json({ error: editCheck.reason }, 403);
    }
  }

  const body = await c.req.json<{
    imageOrder: Array<{ id: string; sort_order: number; caption?: string | null }>;
  }>();

  // Update sort orders and captions
  const statements = body.imageOrder.map((img) =>
    c.env.DB.prepare("UPDATE project_images SET sort_order = ?, caption = ? WHERE id = ? AND project_id = ?").bind(
      img.sort_order,
      img.caption ?? null,
      img.id,
      projectId
    )
  );

  // Always update project timestamp when images change
  statements.push(c.env.DB.prepare("UPDATE projects SET updated_at = datetime('now') WHERE id = ?").bind(projectId));

  await c.env.DB.batch(statements);

  // Return updated images
  const { results: images } = await c.env.DB.prepare(
    "SELECT * FROM project_images WHERE project_id = ? ORDER BY sort_order ASC, id ASC"
  )
    .bind(projectId)
    .all<ProjectImage>();

  return c.json({ images: images ?? [] });
});

// =====================================================
// Helper functions for image uploads
// =====================================================

function generateRandomId(length = 22): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues, (v) => chars[v % chars.length]).join("");
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, "") // Trim hyphens from ends
    .substring(0, 50); // Limit length
}

function shortenAcademicYear(year: string): string {
  const match = year.match(/^(\d{4})-(\d{4})$/);
  if (match) {
    return `${match[1].slice(2)}-${match[2].slice(2)}`;
  }
  return year.replace(/[^a-z0-9-]/gi, "").substring(0, 10);
}

function getFileExtension(filename: string, mimeType: string): string {
  const extMatch = filename.match(/\.([a-z0-9]+)$/i);
  if (extMatch) {
    return extMatch[1].toLowerCase();
  }
  const mimeExtensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
  };
  return mimeExtensions[mimeType] || "jpg";
}

// Sanitize filename for safe use in R2 keys (keep it recognizable)
function sanitizeFilename(filename: string): string {
  // Remove extension first
  const lastDot = filename.lastIndexOf(".");
  const name = lastDot > 0 ? filename.slice(0, lastDot) : filename;
  // Replace spaces with underscores, remove unsafe characters, collapse multiple underscores
  return name
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_.-]/g, "")
    .replace(/_+/g, "_")
    .slice(0, 100); // Limit length
}

// Get email slug for a project (looks up user email)
async function getProjectEmailSlug(c: Context<{ Bindings: Bindings }>, project: Project): Promise<string | null> {
  if (!project.user_id) return null;
  const user = await c.env.DB.prepare("SELECT email FROM users WHERE id = ?")
    .bind(project.user_id)
    .first<{ email: string }>();
  if (!user) return null;
  return emailSlug(user.email);
}

// =====================================================
// Image Upload Routes
// =====================================================

// Upload image to Cloudflare Images (web images)
adminApiRoutes.post("/projects/:id/images/upload", async (c) => {
  const projectId = c.req.param("id");
  const user = c.get("user");
  const project = await checkProjectAccess(c, projectId);

  if (!project) {
    return c.json({ error: "Project not found or access denied" }, 404);
  }

  // Check edit permissions for students
  if (!isAdminOrEditor(user)) {
    const editCheck = canStudentEdit(project);
    if (!editCheck.allowed) {
      return c.json({ error: editCheck.reason }, 403);
    }
  }

  // Validate required fields for image path
  if (!project.student_name || !project.student_name.trim()) {
    return c.json({ error: "Student name is required before uploading images" }, 400);
  }
  if (!project.academic_year || !project.academic_year.trim()) {
    return c.json({ error: "Academic year is required before uploading images" }, 400);
  }

  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return c.json({ error: "No file provided" }, 400);
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"];
  if (!allowedTypes.includes(file.type)) {
    return c.json({ error: "Invalid file type. Allowed: JPEG, PNG, GIF, WebP, HEIC" }, 400);
  }

  // Use email slug for stable paths
  const userEmailSlug = await getProjectEmailSlug(c, project);
  const yearShort = shortenAcademicYear(project.academic_year);
  const studentSlug = userEmailSlug || slugify(project.student_name);
  const randomId = generateRandomId();
  const extension = getFileExtension(file.name, file.type);
  const customImageId = `${R2_PATH_PREFIX}/${yearShort}/${studentSlug}/${randomId}.${extension}`;

  // Upload to Cloudflare Images with custom ID
  const cfFormData = new FormData();
  cfFormData.append("file", file);
  cfFormData.append("id", customImageId);

  const uploadResponse = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${c.env.CLOUDFLARE_ACCOUNT_ID}/images/v1`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.env.CLOUDFLARE_API_TOKEN}`,
      },
      body: cfFormData,
    }
  );

  const uploadResult = (await uploadResponse.json()) as {
    success: boolean;
    errors?: Array<{ message: string }>;
    result?: { id: string };
  };

  if (!uploadResult.success || !uploadResult.result) {
    const errorMsg = uploadResult.errors?.[0]?.message || "Upload failed";
    if (errorMsg.includes("dimension") || errorMsg.includes("size")) {
      return c.json({ error: "Image too large. Maximum: 10MB, 12,000px on longest side." }, 400);
    }
    return c.json({ error: errorMsg }, 400);
  }

  const cloudflareId = uploadResult.result.id;

  // Get current max sort_order for web images
  const maxOrder = await c.env.DB.prepare(
    "SELECT MAX(sort_order) as max_order FROM project_images WHERE project_id = ? AND type = 'web'"
  )
    .bind(projectId)
    .first<{ max_order: number | null }>();

  const newSortOrder = (maxOrder?.max_order ?? -1) + 1;
  const imageId = crypto.randomUUID();

  // Insert into database with type='web'
  await c.env.DB.prepare(
    "INSERT INTO project_images (id, project_id, cloudflare_id, sort_order, caption, type) VALUES (?, ?, ?, ?, NULL, 'web')"
  )
    .bind(imageId, projectId, cloudflareId, newSortOrder)
    .run();

  const newImage = await c.env.DB.prepare("SELECT * FROM project_images WHERE id = ?")
    .bind(imageId)
    .first<ProjectImage>();

  return c.json({ image: newImage });
});

// Upload print image to R2
adminApiRoutes.post("/projects/:id/print-image/upload", async (c) => {
  const projectId = c.req.param("id");
  const user = c.get("user");
  const project = await checkProjectAccess(c, projectId);

  if (!project) {
    return c.json({ error: "Project not found or access denied" }, 404);
  }

  // Check edit permissions for students
  if (!isAdminOrEditor(user)) {
    const editCheck = canStudentEdit(project);
    if (!editCheck.allowed) {
      return c.json({ error: editCheck.reason }, 403);
    }
  }

  // Validate required fields
  if (!project.academic_year || !project.academic_year.trim()) {
    return c.json({ error: "Academic year is required before uploading print image" }, 400);
  }

  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return c.json({ error: "No file provided" }, 400);
  }

  // Only allow JPEG and PNG for print images
  const allowedTypes = ["image/jpeg", "image/png"];
  if (!allowedTypes.includes(file.type)) {
    return c.json({ error: "Invalid file type. Only JPEG and PNG are allowed for print images." }, 400);
  }

  const yearShort = shortenAcademicYear(project.academic_year);
  const extension = getFileExtension(file.name, file.type);

  // Require linked user account for email-based naming
  if (!project.user_id) {
    return c.json({ error: "Project must have a linked user account before uploading print images" }, 400);
  }
  const userEmailSlugValue = await getProjectEmailSlug(c, project);
  if (!userEmailSlugValue) {
    return c.json({ error: "Could not determine email for print image naming" }, 400);
  }
  const r2Key = `${R2_PATH_PREFIX}/print-images/${yearShort}/${userEmailSlugValue}.${extension}`;

  // Check if there's already a print image - delete it first
  const existingPrintImage = await c.env.DB.prepare(
    "SELECT id, cloudflare_id FROM project_images WHERE project_id = ? AND type = 'print'"
  )
    .bind(projectId)
    .first<{ id: string; cloudflare_id: string }>();

  if (existingPrintImage) {
    // Delete from R2
    try {
      await c.env.FILES.delete(existingPrintImage.cloudflare_id);
    } catch {
      // Continue even if delete fails
    }
    // Delete from database
    await c.env.DB.prepare("DELETE FROM project_images WHERE id = ?").bind(existingPrintImage.id).run();
  }

  // Upload to R2
  const fileBuffer = await file.arrayBuffer();
  await c.env.FILES.put(r2Key, fileBuffer, {
    httpMetadata: {
      contentType: file.type,
    },
  });

  // Insert into database with type='print'
  const imageId = crypto.randomUUID();
  await c.env.DB.prepare(
    "INSERT INTO project_images (id, project_id, cloudflare_id, sort_order, caption, type) VALUES (?, ?, ?, 0, NULL, 'print')"
  )
    .bind(imageId, projectId, r2Key)
    .run();

  const newImage = await c.env.DB.prepare("SELECT * FROM project_images WHERE id = ?")
    .bind(imageId)
    .first<ProjectImage>();

  return c.json({ image: newImage });
});

// Update print image caption
adminApiRoutes.put("/projects/:id/print-image/caption", async (c) => {
  const projectId = c.req.param("id");
  const user = c.get("user");
  const project = await checkProjectAccess(c, projectId);

  if (!project) {
    return c.json({ error: "Project not found or access denied" }, 404);
  }

  // Check edit permissions for students
  if (!isAdminOrEditor(user)) {
    const editCheck = canStudentEdit(project);
    if (!editCheck.allowed) {
      return c.json({ error: editCheck.reason }, 403);
    }
  }

  const body = await c.req.json<{ caption: string }>();

  await c.env.DB.prepare("UPDATE project_images SET caption = ? WHERE project_id = ? AND type = 'print'")
    .bind(body.caption || null, projectId)
    .run();

  const updatedImage = await c.env.DB.prepare("SELECT * FROM project_images WHERE project_id = ? AND type = 'print'")
    .bind(projectId)
    .first<ProjectImage>();

  return c.json({ image: updatedImage });
});

// Delete print image
adminApiRoutes.delete("/projects/:id/print-image", async (c) => {
  const projectId = c.req.param("id");
  const user = c.get("user");
  const project = await checkProjectAccess(c, projectId);

  if (!project) {
    return c.json({ error: "Project not found or access denied" }, 404);
  }

  // Check edit permissions for students
  if (!isAdminOrEditor(user)) {
    const editCheck = canStudentEdit(project);
    if (!editCheck.allowed) {
      return c.json({ error: editCheck.reason }, 403);
    }
  }

  const printImage = await c.env.DB.prepare(
    "SELECT id, cloudflare_id FROM project_images WHERE project_id = ? AND type = 'print'"
  )
    .bind(projectId)
    .first<{ id: string; cloudflare_id: string }>();

  if (!printImage) {
    return c.json({ error: "Print image not found" }, 404);
  }

  // Delete from R2
  try {
    await c.env.FILES.delete(printImage.cloudflare_id);
  } catch {
    // Continue even if delete fails
  }

  // Delete from database
  await c.env.DB.prepare("DELETE FROM project_images WHERE id = ?").bind(printImage.id).run();

  return c.json({ success: true });
});

// Delete web image
adminApiRoutes.delete("/projects/:id/images/:imageId", async (c) => {
  const projectId = c.req.param("id");
  const imageId = c.req.param("imageId");
  const user = c.get("user");
  const project = await checkProjectAccess(c, projectId);

  if (!project) {
    return c.json({ error: "Project not found or access denied" }, 404);
  }

  // Check edit permissions for students
  if (!isAdminOrEditor(user)) {
    const editCheck = canStudentEdit(project);
    if (!editCheck.allowed) {
      return c.json({ error: editCheck.reason }, 403);
    }
  }

  const image = await c.env.DB.prepare("SELECT * FROM project_images WHERE id = ? AND project_id = ?")
    .bind(imageId, projectId)
    .first<ProjectImage>();

  if (!image) {
    return c.json({ error: "Image not found" }, 404);
  }

  // Delete from appropriate storage based on type
  if (image.type === "print") {
    try {
      await c.env.FILES.delete(image.cloudflare_id);
    } catch {
      // Continue even if delete fails
    }
  } else {
    // Delete from Cloudflare Images
    try {
      await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${c.env.CLOUDFLARE_ACCOUNT_ID}/images/v1/${image.cloudflare_id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${c.env.CLOUDFLARE_API_TOKEN}`,
          },
        }
      );
    } catch {
      // Continue even if delete fails
    }
  }

  // Delete from database
  await c.env.DB.prepare("DELETE FROM project_images WHERE id = ?").bind(imageId).run();

  // Reorder remaining web images
  const { results: remainingImages } = await c.env.DB.prepare(
    "SELECT id FROM project_images WHERE project_id = ? AND type = 'web' ORDER BY sort_order ASC"
  )
    .bind(projectId)
    .all<{ id: string }>();

  if (remainingImages && remainingImages.length > 0) {
    const reorderStatements = remainingImages.map((img, idx) =>
      c.env.DB.prepare("UPDATE project_images SET sort_order = ? WHERE id = ?").bind(idx, img.id)
    );
    await c.env.DB.batch(reorderStatements);
  }

  await c.env.DB.prepare("UPDATE projects SET updated_at = datetime('now') WHERE id = ?").bind(projectId).run();

  return c.json({ success: true });
});

// =====================================================
// Project Submission
// =====================================================

// Validate project for submission
function validateProjectForSubmission(project: Project, images: ProjectImage[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!project.project_title_en?.trim()) {
    errors.push("English project title is required");
  }
  if (!project.project_title_nl?.trim()) {
    errors.push("Dutch project title is required");
  }
  if (!project.bio_en?.trim()) {
    errors.push("English bio is required");
  }
  if (!project.bio_nl?.trim()) {
    errors.push("Dutch bio is required");
  }
  if (!project.description_en?.trim()) {
    errors.push("English description is required");
  }
  if (!project.description_nl?.trim()) {
    errors.push("Dutch description is required");
  }
  if (!project.location_en?.trim()) {
    errors.push("English location is required");
  }
  if (!project.location_nl?.trim()) {
    errors.push("Dutch location is required");
  }
  const webImages = images.filter((img) => img.type !== "print");
  if (webImages.length === 0) {
    errors.push("Main image is required");
  }

  // Check for print image with caption
  const printImage = images.find((img) => img.type === "print");
  if (!printImage) {
    errors.push("Print image is required");
  } else if (!printImage.caption?.trim()) {
    errors.push("Print image caption is required");
  }

  return { valid: errors.length === 0, errors };
}

// Get submission validation status
adminApiRoutes.get("/projects/:id/submit/validate", async (c) => {
  const projectId = c.req.param("id");
  const project = await checkProjectAccess(c, projectId);

  if (!project) {
    return c.json({ error: "Project not found or access denied" }, 404);
  }

  const { results: images } = await c.env.DB.prepare("SELECT * FROM project_images WHERE project_id = ?")
    .bind(projectId)
    .all<ProjectImage>();

  const validation = validateProjectForSubmission(project, images ?? []);

  return c.json({
    valid: validation.valid,
    errors: validation.errors,
    status: project.status,
  });
});

// Submit project (changes status from draft to submitted)
adminApiRoutes.post("/projects/:id/submit", async (c) => {
  const projectId = c.req.param("id");
  const user = c.get("user");
  const project = await checkProjectAccess(c, projectId);

  if (!project) {
    return c.json({ error: "Project not found or access denied" }, 404);
  }

  // Only allow submission from draft status
  if (project.status !== "draft") {
    return c.json({ error: `Project cannot be submitted from '${project.status}' status` }, 400);
  }

  // Get images for validation
  const { results: images } = await c.env.DB.prepare("SELECT * FROM project_images WHERE project_id = ?")
    .bind(projectId)
    .all<ProjectImage>();

  // Validate
  const validation = validateProjectForSubmission(project, images ?? []);
  if (!validation.valid) {
    return c.json({ error: "Validation failed", validationErrors: validation.errors }, 400);
  }

  // Update status
  await c.env.DB.prepare("UPDATE projects SET status = 'submitted', updated_at = datetime('now') WHERE id = ?")
    .bind(projectId)
    .run();

  const updatedProject = await c.env.DB.prepare("SELECT * FROM projects WHERE id = ?").bind(projectId).first<Project>();

  return c.json({ project: updatedProject });
});

// =====================================================
// AI Translation
// =====================================================

const TRANSLATE_FIELDS = ["bio", "description"] as const;
type TranslateField = (typeof TRANSLATE_FIELDS)[number];
type TranslateDirection = "nl-to-en" | "en-to-nl";

const NL_TO_EN_SYSTEM = `You are a professional translator for an art school exhibition website.
Translate Dutch text to English. Preserve the student's voice, tone, and artistic intent.
Keep proper nouns, artwork titles, and technical art terms as-is when appropriate.
Output ONLY the translation inside <translation> tags. If you cannot translate, output <translation status="failed" reason="..."></translation>.`;

const EN_TO_NL_SYSTEM = `You are a professional translator for an art school exhibition website.
Translate English text to Dutch. Preserve the student's voice, tone, and artistic intent.
Keep proper nouns, artwork titles, and technical art terms as-is when appropriate.
Output ONLY the translation inside <translation> tags. If you cannot translate, output <translation status="failed" reason="..."></translation>.`;

adminApiRoutes.post("/projects/:id/translate", async (c) => {
  const projectId = c.req.param("id");
  const project = await checkProjectAccess(c, projectId);

  if (!project) {
    return c.json({ error: "Project not found or access denied" }, 404);
  }

  const body = await c.req.json<{ field: string; text: string; direction: string }>();
  const { field, text, direction } = body;

  if (!TRANSLATE_FIELDS.includes(field as TranslateField)) {
    return c.json({ error: "Invalid field" }, 400);
  }
  if (direction !== "nl-to-en" && direction !== "en-to-nl") {
    return c.json({ error: "Invalid direction" }, 400);
  }
  if (!text || !text.trim()) {
    return c.json({ error: "No text to translate" }, 400);
  }

  const systemPrompt = direction === "nl-to-en" ? NL_TO_EN_SYSTEM : EN_TO_NL_SYSTEM;
  const sourceLang = direction === "nl-to-en" ? "Dutch" : "English";

  try {
    const client = new Anthropic({ apiKey: c.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Translate the following ${sourceLang} text (field: ${field}):\n\n${text}`,
        },
        {
          role: "assistant",
          content: "<translation>",
        },
      ],
    });

    const responseText = message.content[0].type === "text" ? "<translation>" + message.content[0].text : "";

    // Parse translation from XML tags
    const translationMatch = responseText.match(/<translation(?:\s[^>]*)?>([^]*?)<\/translation>/);
    const failedMatch = responseText.match(/<translation\s+status="failed"\s+reason="([^"]*)"[^>]*>/);

    if (failedMatch) {
      return c.json({ translation: "", status: "failed", reason: failedMatch[1] });
    }

    if (translationMatch) {
      return c.json({ translation: translationMatch[1].trim(), status: "ok" });
    }

    // Fallback: use the raw response text if no XML tags found
    const rawText = message.content[0].type === "text" ? message.content[0].text.trim() : "";
    if (rawText) {
      // The response starts after our "<translation>" prefix, so strip the closing tag if present
      const cleaned = rawText.replace(/<\/translation>\s*$/, "").trim();
      if (cleaned) {
        return c.json({ translation: cleaned, status: "ok" });
      }
    }

    return c.json({ translation: "", status: "failed", reason: "Could not parse translation" });
  } catch (err) {
    console.error("Translation error:", err);
    return c.json({ translation: "", status: "failed", reason: "Translation service error" }, 500);
  }
});

// =====================================================
// Admin-only routes (user management, project deletion)
// =====================================================

// Delete project (admin/editor only)
adminApiRoutes.delete("/projects/:id", async (c) => {
  const user = c.get("user");
  if (!isAdminOrEditor(user)) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const id = c.req.param("id");
  const project = await c.env.DB.prepare(
    "SELECT id, student_name, COALESCE(NULLIF(project_title_nl, ''), project_title_en) as project_title FROM projects WHERE id = ?"
  )
    .bind(id)
    .first<{ id: string; student_name: string; project_title: string }>();

  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  // Delete the project (CASCADE will delete associated images)
  await c.env.DB.prepare("DELETE FROM projects WHERE id = ?").bind(id).run();

  return c.json({ success: true, deletedProject: project });
});

// Generate sort name (ASCII-normalized for sorting)
function generateSortName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .toLowerCase();
}

// Generate project ID using SHA256 hash
async function generateProjectId(name: string, academicYear: string): Promise<string> {
  const input = `${name}:${academicYear}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Valid programs
const VALID_PROGRAMS = ["BA_FO", "BA_BK", "MA_BK", "PREMA_BK"] as const;
type Program = (typeof VALID_PROGRAMS)[number];

// Valid contexts
const VALID_CONTEXTS = ["autonomous", "applied", "digital", "sociopolitical", "jewelry"] as const;

// Normalize context value to canonical form (case-insensitive, with or without "Context" suffix)
function normalizeContext(input: unknown): ContextKey | null {
  if (typeof input !== "string") return null;
  return normalizeContextKey(input);
}

// =====================================================
// User Management Routes (admin/editor only)
// =====================================================

adminApiRoutes.post("/users/create", async (c) => {
  const user = c.get("user");
  if (!isAdminOrEditor(user)) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const body = await c.req.json<{ email: string; name: string; role: "student" | "editor" | "admin" }>();
  const { email, name, role } = body;

  if (!email || !email.trim()) {
    return c.json({ error: "Email is required" }, 400);
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existing = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?")
    .bind(normalizedEmail)
    .first<{ id: string }>();

  if (existing) {
    return c.json({ error: "Email already exists" }, 409);
  }

  const validRoles = ["student", "editor", "admin"];
  if (!validRoles.includes(role)) {
    return c.json({ error: "Invalid role" }, 400);
  }

  const userId = crypto.randomUUID();
  await c.env.DB.prepare("INSERT INTO users (id, email, name, role) VALUES (?, ?, ?, ?)")
    .bind(userId, normalizedEmail, name?.trim() || null, role)
    .run();

  const newUser = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();

  return c.json({ user: newUser }, 201);
});

adminApiRoutes.get("/users/:id", async (c) => {
  const user = c.get("user");
  if (!isAdminOrEditor(user)) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const id = c.req.param("id");
  const foundUser = await c.env.DB.prepare(
    "SELECT id, email, name, role, created_at, last_login_at FROM users WHERE id = ?"
  )
    .bind(id)
    .first();

  if (!foundUser) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json({ user: foundUser });
});

adminApiRoutes.delete("/users/:id", async (c) => {
  const user = c.get("user");
  if (!isAdminOrEditor(user)) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const id = c.req.param("id");
  const foundUser = await c.env.DB.prepare("SELECT id, email FROM users WHERE id = ?")
    .bind(id)
    .first<{ id: string; email: string }>();

  if (!foundUser) {
    return c.json({ error: "User not found" }, 404);
  }

  await c.env.DB.prepare("DELETE FROM users WHERE id = ?").bind(id).run();

  return c.json({ success: true, deletedEmail: foundUser.email });
});

adminApiRoutes.get("/students-with-projects", async (c) => {
  const user = c.get("user");
  if (!isAdminOrEditor(user)) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const { results: students } = await c.env.DB.prepare(
    `
    SELECT DISTINCT u.id, u.email, u.name, p.academic_year
    FROM users u
    INNER JOIN projects p ON p.user_id = u.id
    WHERE u.role = 'student'
    ORDER BY u.name, u.email
  `
  ).all<{ id: string; email: string; name: string | null; academic_year: string }>();

  return c.json({ students: students ?? [] });
});

// =====================================================
// Export Routes (admin/editor only)
// =====================================================

adminApiRoutes.get("/export/status", requireAdmin, async (c) => {
  const year = c.req.query("year");
  const program = c.req.query("program");
  if (!year || !program) {
    return c.json({ error: "year and program query parameters are required" }, 400);
  }

  const { results } = await c.env.DB.prepare(
    `SELECT
      p.id, p.student_name, p.status, p.user_id,
      u.email,
      pi.id as print_image_id, pi.caption as print_caption
    FROM projects p
    LEFT JOIN users u ON p.user_id = u.id
    LEFT JOIN project_images pi ON p.id = pi.project_id AND pi.type = 'print'
    WHERE p.academic_year = ? AND p.program = ?
    ORDER BY p.sort_name ASC`
  )
    .bind(year, program)
    .all<{
      id: string;
      student_name: string;
      status: string;
      user_id: string | null;
      email: string | null;
      print_image_id: string | null;
      print_caption: string | null;
    }>();

  const students = (results ?? []).map((row) => ({
    id: row.id,
    studentName: row.student_name,
    email: row.email,
    status: row.status,
    hasPrintImage: !!row.print_image_id,
    hasCaption: !!row.print_caption?.trim(),
  }));

  const readyForPrint = students.filter((s) => s.hasPrintImage && s.hasCaption).length;

  return c.json({
    total: students.length,
    readyForPrint,
    students,
  });
});

adminApiRoutes.get("/export/print-images.zip", requireAdmin, async (c) => {
  const year = c.req.query("year");
  const program = c.req.query("program");
  if (!year || !program) {
    return c.json({ error: "year and program query parameters are required" }, 400);
  }

  const { results } = await c.env.DB.prepare(
    `SELECT
      p.id as project_id, p.student_name, p.user_id,
      u.email,
      pi.cloudflare_id, pi.caption
    FROM projects p
    INNER JOIN project_images pi ON p.id = pi.project_id AND pi.type = 'print'
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.academic_year = ? AND p.program = ?
    ORDER BY p.sort_name ASC`
  )
    .bind(year, program)
    .all<{
      project_id: string;
      student_name: string;
      user_id: string | null;
      email: string | null;
      cloudflare_id: string;
      caption: string | null;
    }>();

  if (!results || results.length === 0) {
    return c.json({ error: "No projects with print images found for this year and program" }, 400);
  }

  const data: Record<string, Uint8Array> = {};
  const usedSlugs = new Set<string>();

  for (const row of results) {
    // Skip if no linked user
    if (!row.email) continue;

    let slug = emailSlug(row.email);

    // Handle duplicate slugs
    if (usedSlugs.has(slug)) {
      slug = `${slug}-${row.project_id.slice(0, 8)}`;
    }
    usedSlugs.add(slug);

    // Fetch image from R2
    const r2Object = await c.env.FILES.get(row.cloudflare_id);
    if (!r2Object) continue;

    // Get extension from R2 key
    const extMatch = row.cloudflare_id.match(/\.([a-z0-9]+)$/i);
    const ext = extMatch ? extMatch[1].toLowerCase() : "jpg";

    const imageBytes = new Uint8Array(await r2Object.arrayBuffer());
    data[`${slug}.${ext}`] = imageBytes;

    // Add caption as text file if present
    if (row.caption?.trim()) {
      const encoder = new TextEncoder();
      data[`${slug}.txt`] = encoder.encode(row.caption.trim());
    }
  }

  if (Object.keys(data).length === 0) {
    return c.json({ error: "No print images could be retrieved" }, 400);
  }

  // Create ZIP with store mode (level 0) — images are already compressed
  const zipOptions: Record<string, [Uint8Array, { level: 0 }]> = {};
  for (const [filename, bytes] of Object.entries(data)) {
    zipOptions[filename] = [bytes, { level: 0 }];
  }
  const zipData = zipSync(zipOptions);

  const yearShort = shortenAcademicYear(year);
  return new Response(zipData, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="print-images-${yearShort}-${program}.zip"`,
    },
  });
});

// Bulk create users and projects from CSV
adminApiRoutes.post("/users/bulk-create", async (c) => {
  const user = c.get("user");
  if (!isAdminOrEditor(user)) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const body = await c.req.json<{
    csvData: string;
    program?: string;
    academic_year?: string;
  }>();
  const { csvData, program, academic_year } = body;

  if (!csvData || !csvData.trim()) {
    return c.json({ error: "CSV data is required" }, 400);
  }

  // Validate program if provided
  if (program && !VALID_PROGRAMS.includes(program as Program)) {
    return c.json({ error: "Invalid program" }, 400);
  }

  // Context is required for MA_BK and PREMA_BK (will be validated per-row from CSV)
  const contextRequired = program === "MA_BK" || program === "PREMA_BK";

  // Validate academic_year format (e.g., "2024-2025")
  if (academic_year && !/^\d{4}-\d{4}$/.test(academic_year)) {
    return c.json({ error: "Invalid academic year format. Expected: YYYY-YYYY" }, 400);
  }

  const lines = csvData
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim());
  if (lines.length === 0) {
    return c.json({ error: "No data provided" }, 400);
  }

  const firstLine = lines[0];
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = tabCount >= commaCount ? "\t" : ",";

  // Parse header row (required)
  const headerParts = firstLine.split(delimiter).map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());

  // Validate required columns exist
  const nameIndex = headerParts.indexOf("name");
  const emailIndex = headerParts.indexOf("email");
  const contextIndex = headerParts.indexOf("context");

  if (nameIndex === -1 || emailIndex === -1) {
    return c.json(
      {
        error:
          'CSV must have a header row with "name" and "email" columns. ' +
          `Found columns: ${headerParts.map((h) => `"${h}"`).join(", ") || "(none)"}`,
      },
      400
    );
  }

  // Context column is required for programs that need it
  if (contextRequired && contextIndex === -1) {
    return c.json(
      {
        error:
          'CSV must have a "context" column for MA_BK and PREMA_BK programs. ' +
          `Found columns: ${headerParts.map((h) => `"${h}"`).join(", ")}`,
      },
      400
    );
  }

  const results = {
    usersCreated: 0,
    usersExisting: 0,
    projectsCreated: 0,
    projectsSkipped: 0,
    errors: [] as string[],
  };

  // Determine if we're creating projects
  const createProjects = !!(program && academic_year);

  // Process data rows (skip header at index 0)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(delimiter).map((p) => p.trim().replace(/^"|"$/g, ""));

    // Validate column count matches header
    if (parts.length !== headerParts.length) {
      results.errors.push(
        `Row ${i + 1}: Expected ${headerParts.length} columns (matching header), got ${parts.length}`
      );
      continue;
    }

    const name = parts[nameIndex];
    const email = parts[emailIndex];
    let context: string | null = null;

    // Parse context if column exists
    if (contextIndex !== -1) {
      const rawContext = parts[contextIndex];
      if (rawContext) {
        context = normalizeContext(rawContext);
        if (!context) {
          results.errors.push(
            `Row ${i + 1}: Invalid context "${rawContext}". ` +
              `Valid values: autonomous, applied, digital, socio-political, jewelry ` +
              `(with or without "Context" suffix, case-insensitive)`
          );
          continue;
        }
      }
    }

    // Validate context is present when required
    if (contextRequired && !context) {
      results.errors.push(`Row ${i + 1}: Context is required for ${program} program`);
      continue;
    }

    // Validate name is not empty
    if (!name) {
      results.errors.push(`Row ${i + 1}: Name cannot be empty`);
      continue;
    }

    // Validate email is not empty
    if (!email) {
      results.errors.push(`Row ${i + 1}: Email cannot be empty`);
      continue;
    }

    if (!email.endsWith(STUDENT_EMAIL_DOMAIN)) {
      results.errors.push(`Row ${i + 1}: ${email} - must end with ${STUDENT_EMAIL_DOMAIN}`);
      continue;
    }

    const normalizedEmail = email.toLowerCase();

    // Get or create user
    let userId: string;
    const existingUser = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?")
      .bind(normalizedEmail)
      .first<{ id: string }>();

    if (existingUser) {
      userId = existingUser.id;
      results.usersExisting++;
    } else {
      // Create user as student
      userId = crypto.randomUUID();
      await c.env.DB.prepare("INSERT INTO users (id, email, name, role) VALUES (?, ?, ?, ?)")
        .bind(userId, normalizedEmail, name || null, "student")
        .run();
      results.usersCreated++;
    }

    // Create project if program and academic_year are provided
    if (createProjects) {
      const projectId = await generateProjectId(name, academic_year);

      // Check if project already exists
      const existingProject = await c.env.DB.prepare("SELECT id FROM projects WHERE id = ?")
        .bind(projectId)
        .first<{ id: string }>();

      if (existingProject) {
        results.projectsSkipped++;
      } else {
        // Create blank project
        const slug = slugify(name);
        const sortName = generateSortName(name);

        await c.env.DB.prepare(
          `INSERT INTO projects (
            id, slug, student_name, sort_name,
            project_title_en, project_title_nl,
            program, context, academic_year,
            bio_en, bio_nl,
            description_en, description_nl,
            location_en, location_nl,
            status, user_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            projectId,
            slug,
            name,
            sortName,
            "", // Empty English project title
            "", // Empty Dutch project title
            program,
            context,
            academic_year,
            null, // English bio
            null, // Dutch bio
            "", // Empty English description
            "", // Empty Dutch description
            null, // English location
            null, // Dutch location
            "draft",
            userId
          )
          .run();
        results.projectsCreated++;
      }
    }
  }

  return c.json(results);
});
