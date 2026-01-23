import { Hono } from "hono";
import type { Bindings } from "../types";
import { authMiddleware, requireAdmin } from "../middleware/auth";

export const adminPageRoutes = new Hono<{ Bindings: Bindings }>();

adminPageRoutes.use("*", authMiddleware, requireAdmin);

adminPageRoutes.get("/*", async (c) => {
  const url = new URL(c.req.url);
  const path = url.pathname;

  // Serve the SPA index for non-asset paths under /admin
  if (!path.includes(".") || path.endsWith("/")) {
    url.pathname = "/admin/index.html";
  }

  return c.env.ASSETS.fetch(new Request(url.toString(), c.req.raw));
});
