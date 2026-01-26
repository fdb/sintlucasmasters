import { Hono } from "hono";
import type { Bindings, Project, ProjectImage } from "../types";
import { authMiddleware, requireAdmin } from "../middleware/auth";
import { STUDENT_EMAIL_DOMAIN } from "../constants";

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
    select: "id, project_id, cloudflare_id, sort_order, caption",
    orderBy: "sort_order ASC, id ASC",
  },
  users: {
    select: "id, email, name, role, created_at, last_login_at",
    orderBy: "created_at DESC",
  },
};

const MAX_LIMIT = 1000;

export const adminApiRoutes = new Hono<{ Bindings: Bindings }>();

adminApiRoutes.use("*", authMiddleware, requireAdmin);

adminApiRoutes.get("/tables", (c) => {
  return c.json({ tables: Object.keys(TABLES) });
});

adminApiRoutes.get("/table/:name", async (c) => {
  const name = c.req.param("name");
  const config = TABLES[name];

  if (!config) {
    return c.json({ error: "Unknown table" }, 404);
  }

  const limitParam = c.req.query("limit");
  const limit = Math.min(Math.max(Number(limitParam) || 100, 1), MAX_LIMIT);

  const orderClause = config.orderBy ? ` ORDER BY ${config.orderBy}` : "";
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

adminApiRoutes.get("/projects/:id", async (c) => {
  const id = c.req.param("id");

  const project = await c.env.DB.prepare("SELECT * FROM projects WHERE id = ?").bind(id).first<Project>();

  if (!project) {
    return c.json({ error: "Project not found" }, 404);
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
  const body = await c.req.json<{
    student_name?: string;
    project_title?: string;
    context?: string;
    program?: string;
    academic_year?: string;
    bio?: string | null;
    description?: string;
    status?: string;
    tags?: string | null;
    social_links?: string | null;
    main_image_id?: string;
  }>();

  // Check project exists
  const existing = await c.env.DB.prepare("SELECT id FROM projects WHERE id = ?").bind(id).first();
  if (!existing) {
    return c.json({ error: "Project not found" }, 404);
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
  const project = await c.env.DB.prepare("SELECT * FROM projects WHERE id = ?").bind(id).first<Project>();

  return c.json({ project });
});

// Reorder project images and update captions
adminApiRoutes.put("/projects/:id/images/reorder", async (c) => {
  const projectId = c.req.param("id");
  const body = await c.req.json<{
    imageOrder: Array<{ id: string; sort_order: number; caption?: string | null }>;
    mainImageId?: string;
  }>();

  // Check project exists
  const project = await c.env.DB.prepare("SELECT id FROM projects WHERE id = ?").bind(projectId).first();
  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

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

// Generate a random alphanumeric ID (22 chars, similar to YouTube video IDs)
function generateRandomId(length = 22): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues, (v) => chars[v % chars.length]).join("");
}

// Slugify a string for use in image paths
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, "") // Trim hyphens from ends
    .substring(0, 50); // Limit length
}

// Shorten academic year: "2024-2025" -> "24-25"
function shortenAcademicYear(year: string): string {
  const match = year.match(/^(\d{4})-(\d{4})$/);
  if (match) {
    return `${match[1].slice(2)}-${match[2].slice(2)}`;
  }
  return year.replace(/[^a-z0-9-]/gi, "").substring(0, 10);
}

// Get file extension from filename or mime type
function getFileExtension(filename: string, mimeType: string): string {
  // Try to get from filename first
  const extMatch = filename.match(/\.([a-z0-9]+)$/i);
  if (extMatch) {
    return extMatch[1].toLowerCase();
  }
  // Fallback to mime type
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

// Upload image to Cloudflare Images
adminApiRoutes.post("/projects/:id/images/upload", async (c) => {
  const projectId = c.req.param("id");

  // Get project with required fields for image path
  const project = await c.env.DB.prepare("SELECT id, student_name, academic_year FROM projects WHERE id = ?")
    .bind(projectId)
    .first<{ id: string; student_name: string; academic_year: string }>();

  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  // Validate required fields for image path
  if (!project.student_name || !project.student_name.trim()) {
    return c.json({ error: "Student name is required before uploading images" }, 400);
  }
  if (!project.academic_year || !project.academic_year.trim()) {
    return c.json({ error: "Academic year is required before uploading images" }, 400);
  }

  // Get the form data with the file
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

  // Generate custom image ID with prefix
  // Format: slam/{year-short}/{student-slug}/{randomId}.{ext}
  const yearShort = shortenAcademicYear(project.academic_year);
  const studentSlug = slugify(project.student_name);
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
    // Check for dimension/size error
    if (errorMsg.includes("dimension") || errorMsg.includes("size")) {
      return c.json({ error: "Image too large. Maximum: 10MB, 12,000px on longest side." }, 400);
    }
    return c.json({ error: errorMsg }, 400);
  }

  const cloudflareId = uploadResult.result.id;

  // Get current max sort_order
  const maxOrder = await c.env.DB.prepare(
    "SELECT MAX(sort_order) as max_order FROM project_images WHERE project_id = ?"
  )
    .bind(projectId)
    .first<{ max_order: number | null }>();

  const newSortOrder = (maxOrder?.max_order ?? -1) + 1;

  // Generate unique ID
  const imageId = crypto.randomUUID();

  // Insert into database
  await c.env.DB.prepare(
    "INSERT INTO project_images (id, project_id, cloudflare_id, sort_order, caption) VALUES (?, ?, ?, ?, NULL)"
  )
    .bind(imageId, projectId, cloudflareId, newSortOrder)
    .run();

  // Return the new image
  const newImage = await c.env.DB.prepare("SELECT * FROM project_images WHERE id = ?")
    .bind(imageId)
    .first<ProjectImage>();

  return c.json({ image: newImage });
});

// Delete image
adminApiRoutes.delete("/projects/:id/images/:imageId", async (c) => {
  const projectId = c.req.param("id");
  const imageId = c.req.param("imageId");

  // Get the image to delete
  const image = await c.env.DB.prepare("SELECT * FROM project_images WHERE id = ? AND project_id = ?")
    .bind(imageId, projectId)
    .first<ProjectImage>();

  if (!image) {
    return c.json({ error: "Image not found" }, 404);
  }

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
    // Continue even if Cloudflare delete fails - we still want to remove from DB
  }

  // Delete from database
  await c.env.DB.prepare("DELETE FROM project_images WHERE id = ?").bind(imageId).run();

  // Check if this was the main image
  const project = await c.env.DB.prepare("SELECT main_image_id FROM projects WHERE id = ?")
    .bind(projectId)
    .first<{ main_image_id: string }>();

  if (project?.main_image_id === image.cloudflare_id) {
    // Set a new main image if there are remaining images
    const firstImage = await c.env.DB.prepare(
      "SELECT cloudflare_id FROM project_images WHERE project_id = ? ORDER BY sort_order ASC LIMIT 1"
    )
      .bind(projectId)
      .first<{ cloudflare_id: string }>();

    if (firstImage) {
      await c.env.DB.prepare("UPDATE projects SET main_image_id = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(firstImage.cloudflare_id, projectId)
        .run();
    }
  }

  // Reorder remaining images
  const { results: remainingImages } = await c.env.DB.prepare(
    "SELECT id FROM project_images WHERE project_id = ? ORDER BY sort_order ASC"
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
// User Creation Endpoints
// =====================================================

// Create single user
adminApiRoutes.post("/users/create", async (c) => {
  const body = await c.req.json<{ email: string; name: string; role: "student" | "editor" | "admin" }>();

  const { email, name, role } = body;

  if (!email || !email.trim()) {
    return c.json({ error: "Email is required" }, 400);
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Check if user already exists
  const existing = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?")
    .bind(normalizedEmail)
    .first<{ id: string }>();

  if (existing) {
    return c.json({ error: "Email already exists" }, 409);
  }

  // Validate role
  const validRoles = ["student", "editor", "admin"];
  if (!validRoles.includes(role)) {
    return c.json({ error: "Invalid role" }, 400);
  }

  // Generate UUID and create user
  const userId = crypto.randomUUID();
  await c.env.DB.prepare("INSERT INTO users (id, email, name, role) VALUES (?, ?, ?, ?)")
    .bind(userId, normalizedEmail, name?.trim() || null, role)
    .run();

  // Return created user
  const newUser = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();

  return c.json({ user: newUser }, 201);
});

// Get user detail
adminApiRoutes.get("/users/:id", async (c) => {
  const id = c.req.param("id");

  const user = await c.env.DB.prepare("SELECT id, email, name, role, created_at, last_login_at FROM users WHERE id = ?")
    .bind(id)
    .first();

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json({ user });
});

// Delete user
adminApiRoutes.delete("/users/:id", async (c) => {
  const id = c.req.param("id");

  // Check user exists
  const user = await c.env.DB.prepare("SELECT id, email FROM users WHERE id = ?")
    .bind(id)
    .first<{ id: string; email: string }>();

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  // Delete the user
  await c.env.DB.prepare("DELETE FROM users WHERE id = ?").bind(id).run();

  return c.json({ success: true, deletedEmail: user.email });
});

// Delete project
adminApiRoutes.delete("/projects/:id", async (c) => {
  const id = c.req.param("id");

  // Get project details for response
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

// Get students with their projects for impersonation dropdown
adminApiRoutes.get("/students-with-projects", async (c) => {
  // Get all students who have at least one project
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

// Bulk create users from CSV
adminApiRoutes.post("/users/bulk-create", async (c) => {
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

  // Detect delimiter: count tabs vs commas in first non-empty line
  const firstLine = lines[0];
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = tabCount >= commaCount ? "\t" : ",";

  // Check for header row (contains "name" or "email" case-insensitive)
  const firstLineLower = firstLine.toLowerCase();
  let startIndex = 0;
  if (firstLineLower.includes("name") || firstLineLower.includes("email")) {
    startIndex = 1; // Skip header row
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

    // Validate exactly 2 columns
    if (parts.length !== 2) {
      results.errors.push(`Row ${i + 1}: Expected 2 columns, got ${parts.length}`);
      continue;
    }

    // Auto-detect column order (email contains "@")
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

    // Validate student email domain
    if (!email.endsWith(STUDENT_EMAIL_DOMAIN)) {
      results.errors.push(`Row ${i + 1}: ${email} - must end with ${STUDENT_EMAIL_DOMAIN}`);
      continue;
    }

    const normalizedEmail = email.toLowerCase();

    // Check if already exists
    const existing = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?")
      .bind(normalizedEmail)
      .first<{ id: string }>();

    if (existing) {
      results.skipped.push(normalizedEmail);
      continue;
    }

    // Create user as student
    const userId = crypto.randomUUID();
    await c.env.DB.prepare("INSERT INTO users (id, email, name, role) VALUES (?, ?, ?, ?)")
      .bind(userId, normalizedEmail, name || null, "student")
      .run();

    results.created++;
  }

  return c.json(results);
});
