import { Hono } from "hono";
import type { Bindings, Project, ProjectImage } from "../types";
import { authMiddleware, requireAdmin } from "../middleware/auth";

type TableConfig = {
  select: string;
  orderBy?: string;
};

const TABLES: Record<string, TableConfig> = {
  users: {
    select: "id, email, name, role, created_at, last_login_at",
    orderBy: "created_at DESC",
  },
  projects: {
    select: "id, slug, student_name, sort_name, project_title, context, academic_year, status, updated_at, user_id",
    orderBy: "updated_at DESC",
  },
  project_images: {
    select: "id, project_id, cloudflare_id, sort_order, caption",
    orderBy: "sort_order ASC, id ASC",
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

  await c.env.DB.prepare(query).bind(...values).run();

  // Return updated project
  const project = await c.env.DB.prepare("SELECT * FROM projects WHERE id = ?").bind(id).first<Project>();

  return c.json({ project });
});

// Reorder project images
adminApiRoutes.put("/projects/:id/images/reorder", async (c) => {
  const projectId = c.req.param("id");
  const body = await c.req.json<{
    imageOrder: Array<{ id: string; sort_order: number }>;
    mainImageId?: string;
  }>();

  // Check project exists
  const project = await c.env.DB.prepare("SELECT id FROM projects WHERE id = ?").bind(projectId).first();
  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  // Update sort orders
  const statements = body.imageOrder.map((img) =>
    c.env.DB.prepare("UPDATE project_images SET sort_order = ? WHERE id = ? AND project_id = ?").bind(
      img.sort_order,
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
