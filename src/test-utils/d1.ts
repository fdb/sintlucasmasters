import { Miniflare } from "miniflare";
import { readFileSync, readdirSync } from "node:fs";
import { AUTH_COOKIE_NAME } from "../middleware/auth";
import { signToken } from "../lib/jwt";
import type { UserRole } from "../types";

export const TEST_JWT_SECRET = "test-jwt-secret";

// A fresh local D1 with all migrations applied. Call dispose() when done.
export async function createTestDb() {
  const runtime = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response(); } }",
    compatibilityDate: "2026-03-17",
    d1Databases: ["DB"],
  });
  const db = await runtime.getD1Database("DB");
  const migrations = new URL("../../migrations/", import.meta.url);
  for (const file of readdirSync(migrations)
    .filter((file) => file.endsWith(".sql"))
    .sort()) {
    const statements = readFileSync(new URL(file, migrations), "utf8")
      .replace(/--[^\n]*/g, "")
      .split(";")
      .map((sql) => sql.trim())
      .filter(Boolean);
    await db.batch(statements.map((sql) => db.prepare(sql)));
  }
  return { db, dispose: () => runtime.dispose() };
}

export async function authCookie(userId: string, role: UserRole, email = `${userId}@example.com`) {
  const token = await signToken({ userId, email, role }, TEST_JWT_SECRET);
  return `${AUTH_COOKIE_NAME}=${token}`;
}
