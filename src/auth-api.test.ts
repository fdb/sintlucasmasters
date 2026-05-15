import { describe, expect, it, vi } from "vitest";
import { app } from "./index";

function createLoginEnv(userExists: boolean) {
  const run = vi.fn(async () => ({ success: true }));

  return {
    E2E_DISABLE_EMAIL: "true",
    APP_BASE_URL: "http://localhost:8787",
    DB: {
      prepare(sql: string) {
        return {
          bind() {
            return {
              async first() {
                if (sql.includes("SELECT id FROM users WHERE email = ?")) {
                  return userExists ? { id: "user-1" } : null;
                }

                return null;
              },
              run,
            };
          },
        };
      },
    },
  };
}

describe("POST /api/auth/login", () => {
  it("confirms that a sign-in email is on the way for registered accounts", async () => {
    const response = await app.request(
      "/api/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "student@example.com" }),
      },
      createLoginEnv(true) as never
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      status: "email_sent",
      message: "Check your email for a login link",
    });
  });

  it("clearly tells users when no account exists for the email address", async () => {
    const response = await app.request(
      "/api/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "missing@example.com" }),
      },
      createLoginEnv(false) as never
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      status: "account_not_found",
      message: "No account exists for this email address",
    });
  });
});
