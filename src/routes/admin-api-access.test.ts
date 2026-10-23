import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { app } from "../index";
import { authCookie, createTestDb, TEST_JWT_SECRET } from "../test-utils/d1";

describe("admin API access control", () => {
  let db: Awaited<ReturnType<typeof createTestDb>>["db"];
  let dispose: () => Promise<void>;

  beforeEach(async () => {
    ({ db, dispose } = await createTestDb());
    await db.exec(
      "INSERT INTO users (id, email, name, role) VALUES " +
        "('alice', 'alice@student.kdg.be', 'Alice', 'student'), " +
        "('bob', 'bob@student.kdg.be', 'Bob', 'student'), " +
        "('ed', 'ed@kdg.be', 'Ed', 'editor'), " +
        "('ada', 'ada@kdg.be', 'Ada', 'admin'), " +
        "('zoe', 'zoe@student.kdg.be', 'Zoe', 'student')"
    );
    await db.exec(
      "INSERT INTO projects (id, slug, student_name, sort_name, project_title_en, project_title_nl, program, context, academic_year, description_en, description_nl, status, user_id) VALUES " +
        "('pa', 'alice', 'Alice', 'alice', 'A', 'A', 'MA_BK', 'digital', '2025-2026', '', '', 'draft', 'alice'), " +
        "('pb', 'bob', 'Bob', 'bob', 'B', 'B', 'MA_BK', 'digital', '2025-2026', '', '', 'draft', 'bob')"
    );
  });

  afterEach(async () => {
    await dispose();
  });

  const env = () => ({ DB: db, JWT_SECRET: TEST_JWT_SECRET, APP_BASE_URL: "https://example.com" }) as never;
  const request = async (path: string, as: [string, "student" | "editor" | "admin"], init: RequestInit = {}) =>
    app.request(
      path,
      {
        ...init,
        headers: { ...(init.headers ?? {}), Cookie: await authCookie(...as), "Content-Type": "application/json" },
      },
      env()
    );

  it("ignores forUserId when a student lists projects", async () => {
    const response = await request("/api/admin/table/projects?forUserId=bob", ["alice", "student"]);
    const { rows } = await response.json<{ rows: { user_id: string }[] }>();
    expect(rows.map((row) => row.user_id)).toEqual(["alice"]);
  });

  it.each([
    ["POST", "/api/admin/users/create", { email: "new@kdg.be", name: "New", role: "student" }],
    ["POST", "/api/admin/users/bulk-create", { csvData: "name,email\nNew,new@student.kdg.be" }],
    ["DELETE", "/api/admin/users/zoe", undefined],
  ])("forbids editors from %s %s", async (method, path, body) => {
    const response = await request(path, ["ed", "editor"], { method, body: body && JSON.stringify(body) });
    expect(response.status).toBe(403);
    const { count } = (await db.prepare("SELECT COUNT(*) AS count FROM users").first<{ count: number }>())!;
    expect(count).toBe(5);
  });

  it.each([
    ["POST", "/api/admin/users/create", { email: "new@kdg.be", name: "New", role: "student" }, 201],
    ["POST", "/api/admin/users/bulk-create", { csvData: "name,email\nNew,new@student.kdg.be" }, 200],
    ["DELETE", "/api/admin/users/zoe", undefined, 200],
  ])("lets admins %s %s", async (method, path, body, status) => {
    const response = await request(path, ["ada", "admin"], { method, body: body && JSON.stringify(body) });
    expect(response.status).toBe(status);
  });

  it("still lets editors read users", async () => {
    const response = await request("/api/admin/users/bob", ["ed", "editor"]);
    expect(response.status).toBe(200);
  });
});
