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
