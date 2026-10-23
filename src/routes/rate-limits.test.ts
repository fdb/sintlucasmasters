import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { app } from "../index";
import { authCookie, createTestDb, TEST_JWT_SECRET } from "../test-utils/d1";

const deny = { limit: async () => ({ success: false }) };

describe("rate limits", () => {
  let db: Awaited<ReturnType<typeof createTestDb>>["db"];
  let dispose: () => Promise<void>;

  beforeEach(async () => {
    ({ db, dispose } = await createTestDb());
    await db.exec(
      "INSERT INTO users (id, email, name, role) VALUES ('alice', 'alice@student.kdg.be', 'Alice', 'student')"
    );
    await db.exec(
      "INSERT INTO projects (id, slug, student_name, sort_name, project_title_en, project_title_nl, program, context, academic_year, description_en, description_nl, status, user_id) " +
        "VALUES ('pa', 'alice', 'Alice', 'alice', 'A', 'A', 'MA_BK', 'digital', '2025-2026', '', '', 'draft', 'alice')"
    );
  });

  afterEach(async () => {
    await dispose();
  });

  const env = (extra: Record<string, unknown> = {}) =>
    ({
      DB: db,
      JWT_SECRET: TEST_JWT_SECRET,
      APP_BASE_URL: "https://example.com",
      E2E_DISABLE_EMAIL: "true",
      FAKE_TRANSLATION: "true",
      ...extra,
    }) as never;

  const login = (extra?: Record<string, unknown>) =>
    app.request(
      "/api/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "alice@student.kdg.be" }),
      },
      env(extra)
    );

  const tokenCount = async () =>
    (await db.prepare("SELECT COUNT(*) AS count FROM auth_tokens").first<{ count: number }>())!.count;

  it("sends at most 5 sign-in links per email per 15 minutes", async () => {
    for (let i = 0; i < 5; i++) expect((await login()).status).toBe(200);
    const response = await login();
    expect(response.status).toBe(429);
    expect(await tokenCount()).toBe(5);
  });

  it("allows a new sign-in link once older links have expired", async () => {
    for (let i = 0; i < 5; i++) await login();
    await db.exec("UPDATE auth_tokens SET expires_at = '2000-01-01T00:00:00.000Z'");
    expect((await login()).status).toBe(200);
  });

  it("rejects sign-in requests when the per-IP limiter says no", async () => {
    const response = await login({ LOGIN_IP_LIMITER: deny });
    expect(response.status).toBe(429);
    expect(await tokenCount()).toBe(0);
  });

  const translate = async (text: string, extra?: Record<string, unknown>) =>
    app.request(
      "/api/admin/projects/pa/translate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: await authCookie("alice", "student") },
        body: JSON.stringify({ field: "bio", text, direction: "nl-to-en" }),
      },
      env(extra)
    );

  it("rejects translation requests when the per-user limiter says no", async () => {
    expect((await translate("Hallo", { TRANSLATE_LIMITER: deny })).status).toBe(429);
  });

  it("caps the length of text sent for translation", async () => {
    expect((await translate("a".repeat(10_001))).status).toBe(400);
    expect((await translate("a".repeat(10_000))).status).toBe(200);
  });
});
