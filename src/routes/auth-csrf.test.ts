import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { app } from "../index";
import { createTestDb, TEST_JWT_SECRET } from "../test-utils/d1";
import { storeMagicToken } from "../lib/tokens";

// Login CSRF: another site must not be able to submit the sign-in
// confirmation form and log the visitor into the attacker's account.
describe("POST /auth/verify", () => {
  let db: Awaited<ReturnType<typeof createTestDb>>["db"];
  let dispose: () => Promise<void>;

  beforeEach(async () => {
    ({ db, dispose } = await createTestDb());
    await db.exec(
      "INSERT INTO users (id, email, name, role) VALUES ('alice', 'alice@student.kdg.be', 'Alice', 'student')"
    );
    await storeMagicToken(db as never, "alice@student.kdg.be", "token-123");
  });

  afterEach(async () => {
    await dispose();
  });

  const submit = (headers: Record<string, string>) =>
    app.request(
      "http://localhost:8787/auth/verify?token=token-123",
      { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", ...headers }, body: "" },
      { DB: db, JWT_SECRET: TEST_JWT_SECRET, APP_BASE_URL: "http://localhost:8787" } as never
    );

  it("rejects a cross-site submission and leaves the token unused", async () => {
    const response = await submit({ Origin: "https://evil.example" });
    expect(response.status).toBe(403);
    expect(response.headers.get("set-cookie")).toBeNull();
    const row = await db
      .prepare("SELECT used_at FROM auth_tokens WHERE token = 'token-123'")
      .first<{ used_at: string | null }>();
    expect(row?.used_at).toBeNull();
  });

  it("signs in from the confirmation page on the same origin", async () => {
    const response = await submit({ Origin: "http://localhost:8787" });
    expect(response.status).toBe(302);
    expect(response.headers.get("set-cookie")).toContain("auth_token=");
  });
});
