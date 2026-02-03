// Authentication middleware

import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { verifyToken, type JWTPayload } from "../lib/jwt";

export const AUTH_COOKIE_NAME = "auth_token";

import type { User, UserRole } from "../types";

export interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
}

// Extend Hono's context variables
declare module "hono" {
  interface ContextVariableMap {
    user: AuthUser | null;
  }
}

type AuthBindings = {
  DB: D1Database;
  JWT_SECRET: string;
  E2E_SKIP_AUTH?: string;
  DEV_ADMIN_EMAIL?: string;
};

// E2E test user - matches the seeded admin in seed-e2e.mjs
const E2E_TEST_USER: AuthUser = {
  userId: "e2e-admin-001",
  email: "e2e-admin@example.com",
  role: "admin",
};

const DEV_ADMIN_NAME = "Local Dev Admin";

function isLocalDevRequest(c: Context): boolean {
  try {
    const host = new URL(c.req.url).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

async function getDevAdminUser(c: Context<{ Bindings: AuthBindings }>): Promise<AuthUser | null> {
  if (!c.env.DEV_ADMIN_EMAIL) return null;
  if (!isLocalDevRequest(c)) return null;

  const email = c.env.DEV_ADMIN_EMAIL.toLowerCase().trim();
  if (!email) return null;

  let dbUser = await c.env.DB.prepare("SELECT id, email, role FROM users WHERE email = ?")
    .bind(email)
    .first<Pick<User, "id" | "email" | "role">>();

  if (!dbUser) {
    const userId = crypto.randomUUID();
    await c.env.DB.prepare("INSERT INTO users (id, email, name, role) VALUES (?, ?, ?, 'admin')")
      .bind(userId, email, DEV_ADMIN_NAME)
      .run();
    dbUser = { id: userId, email, role: "admin" };
  } else {
    await c.env.DB.prepare("UPDATE users SET role = 'admin', name = COALESCE(name, ?) WHERE email = ?")
      .bind(DEV_ADMIN_NAME, email)
      .run();
  }

  if (!dbUser) return null;

  return {
    userId: dbUser.id,
    email: dbUser.email,
    role: dbUser.role as UserRole,
  };
}

// Parse JWT from cookie and attach user to context (does not enforce auth)
export async function authMiddleware(c: Context<{ Bindings: AuthBindings }>, next: Next): Promise<Response | void> {
  // E2E bypass: inject fake admin user when E2E_SKIP_AUTH is enabled
  if (c.env.E2E_SKIP_AUTH === "true") {
    c.set("user", E2E_TEST_USER);
    await next();
    return;
  }

  try {
    const devUser = await getDevAdminUser(c);
    if (devUser) {
      c.set("user", devUser);
      await next();
      return;
    }
  } catch (error) {
    console.warn("Dev auto-admin failed; falling back to normal auth.", error);
  }

  const token = getCookie(c, AUTH_COOKIE_NAME);

  if (token) {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    if (payload) {
      c.set("user", {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
      });
    } else {
      c.set("user", null);
    }
  } else {
    c.set("user", null);
  }

  await next();
}

// Require authentication - redirect to login if not authenticated
export async function requireAuth(c: Context<{ Bindings: AuthBindings }>, next: Next): Promise<Response | void> {
  const user = c.get("user");

  if (!user) {
    // For API routes, return 401
    if (c.req.path.startsWith("/api/")) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    // For page routes, redirect to login
    return c.redirect("/auth/login");
  }

  await next();
}

// Require admin role - return 403 if not admin
export async function requireAdmin(c: Context<{ Bindings: AuthBindings }>, next: Next): Promise<Response | void> {
  const user = c.get("user");

  if (!user) {
    if (c.req.path.startsWith("/api/")) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    return c.redirect("/auth/login");
  }

  if (user.role !== "admin" && user.role !== "editor") {
    if (c.req.path.startsWith("/api/")) {
      return c.json({ error: "Forbidden" }, 403);
    }
    return c.text("Forbidden", 403);
  }

  await next();
}
