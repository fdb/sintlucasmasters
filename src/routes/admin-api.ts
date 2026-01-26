import { Hono } from "hono";
import type { Context } from "hono";
import type { Bindings, Project, ProjectImage, UserRole } from "../types";
import { authMiddleware, requireAuth, requireAdmin, type AuthUser } from "../middleware/auth";
import { STUDENT_EMAIL_DOMAIN } from "../constants";
import { emailSlug } from "../lib/names";

type TableConfig = {
  select: string;
  orderBy?: string;
};

const TABLES: Record<string, TableConfig> = {
  projects: {
    select: "id, slug, student_name, sort_name, project_title, context, academic_year, status, updated_at, user_id",
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
  "project_title",
  "bio",
  "description",
  "social_links",
  "tags",
  "main_image_id",
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
    `SELECT id, slug, student_name, sort_name, project_title, context, academic_year, status, updated_at, user_id
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

  return c.json({
    project,
    images: images ?? [],
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
  if (body.project_title !== undefined) {
    updates.push("project_title = ?");
    values.push(body.project_title);
  }
  if (body.context !== undefined) {
    updates.push("context = ?");
    values.push(body.context);
  }
  if (body.program !== undefined) {
    updates.push("program = ?");
    values.push(body.program);
  }
  if (body.academic_year !== undefined) {
    updates.push("academic_year = ?");
    values.push(body.academic_year);
  }
  if (body.bio !== undefined) {
    updates.push("bio = ?");
    values.push(body.bio);
  }
  if (body.description !== undefined) {
    updates.push("description = ?");
    values.push(body.description);
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
    values.push(body.social_links);
  }
  if (body.main_image_id !== undefined) {
    updates.push("main_image_id = ?");
    values.push(body.main_image_id);
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
    mainImageId?: string;
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

  // Update main image if provided
  if (body.mainImageId) {
    statements.push(
      c.env.DB.prepare("UPDATE projects SET main_image_id = ?, updated_at = datetime('now') WHERE id = ?").bind(
        body.mainImageId,
        projectId
      )
    );
  }

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
  const customImageId = `slam/${yearShort}/${studentSlug}/${randomId}.${extension}`;

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

  // Generate R2 key
  const userEmailSlug = await getProjectEmailSlug(c, project);
  const yearShort = shortenAcademicYear(project.academic_year);
  const studentSlug = userEmailSlug || slugify(project.student_name);
  const randomId = generateRandomId();
  const extension = getFileExtension(file.name, file.type);
  const r2Key = `print-images/${yearShort}/${studentSlug}/${randomId}.${extension}`;

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

  // Check if this was the main image
  const currentProject = await c.env.DB.prepare("SELECT main_image_id FROM projects WHERE id = ?")
    .bind(projectId)
    .first<{ main_image_id: string }>();

  if (currentProject?.main_image_id === image.cloudflare_id) {
    // Set a new main image if there are remaining web images
    const firstImage = await c.env.DB.prepare(
      "SELECT cloudflare_id FROM project_images WHERE project_id = ? AND type = 'web' ORDER BY sort_order ASC LIMIT 1"
    )
      .bind(projectId)
      .first<{ cloudflare_id: string }>();

    if (firstImage) {
      await c.env.DB.prepare("UPDATE projects SET main_image_id = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(firstImage.cloudflare_id, projectId)
        .run();
    }
  }

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

  return c.json({ success: true });
});

// =====================================================
// Project Submission
// =====================================================

// Validate project for submission
function validateProjectForSubmission(project: Project, images: ProjectImage[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!project.project_title?.trim()) {
    errors.push("Project title is required");
  }
  if (!project.bio?.trim()) {
    errors.push("Bio is required");
  }
  if (!project.description?.trim()) {
    errors.push("Description is required");
  }
  if (!project.main_image_id?.trim()) {
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
// Admin-only routes (user management, project deletion)
// =====================================================

// Delete project (admin/editor only)
adminApiRoutes.delete("/projects/:id", async (c) => {
  const user = c.get("user");
  if (!isAdminOrEditor(user)) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const id = c.req.param("id");
  const project = await c.env.DB.prepare("SELECT id, student_name, project_title FROM projects WHERE id = ?")
    .bind(id)
    .first<{ id: string; student_name: string; project_title: string }>();

  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  // Delete the project (CASCADE will delete associated images)
  await c.env.DB.prepare("DELETE FROM projects WHERE id = ?").bind(id).run();

  return c.json({ success: true, deletedProject: project });
});

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

adminApiRoutes.post("/users/bulk-create", async (c) => {
  const user = c.get("user");
  if (!isAdminOrEditor(user)) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const body = await c.req.json<{ csvData: string }>();
  const { csvData } = body;

  if (!csvData || !csvData.trim()) {
    return c.json({ error: "CSV data is required" }, 400);
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

  const firstLineLower = firstLine.toLowerCase();
  let startIndex = 0;
  if (firstLineLower.includes("name") || firstLineLower.includes("email")) {
    startIndex = 1;
  }

  const results = {
    created: 0,
    skipped: [] as string[],
    errors: [] as string[],
  };

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(delimiter).map((p) => p.trim().replace(/^"|"$/g, ""));

    if (parts.length !== 2) {
      results.errors.push(`Row ${i + 1}: Expected 2 columns, got ${parts.length}`);
      continue;
    }

    let name: string;
    let email: string;
    if (parts[0].includes("@")) {
      email = parts[0];
      name = parts[1];
    } else if (parts[1].includes("@")) {
      name = parts[0];
      email = parts[1];
    } else {
      results.errors.push(`Row ${i + 1}: Could not detect email column`);
      continue;
    }

    if (!email.endsWith(STUDENT_EMAIL_DOMAIN)) {
      results.errors.push(`Row ${i + 1}: ${email} - must end with ${STUDENT_EMAIL_DOMAIN}`);
      continue;
    }

    const normalizedEmail = email.toLowerCase();

    const existing = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?")
      .bind(normalizedEmail)
      .first<{ id: string }>();

    if (existing) {
      results.skipped.push(normalizedEmail);
      continue;
    }

    const userId = crypto.randomUUID();
    await c.env.DB.prepare("INSERT INTO users (id, email, name, role) VALUES (?, ?, ?, ?)")
      .bind(userId, normalizedEmail, name || null, "student")
      .run();

    results.created++;
  }

  return c.json(results);
});
