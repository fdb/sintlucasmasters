import { describe, expect, it, vi } from "vitest";
import { app } from "./index";

type OutgoingMessage = { from: unknown; to: string; subject: string; html: string; text: string };

function createLoginEnv(userExists: boolean, overrides: Record<string, unknown> = {}) {
  const run = vi.fn(async () => ({ success: true }));

  return {
    E2E_DISABLE_EMAIL: "true",
    APP_BASE_URL: "http://localhost:8787",
    ...overrides,
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

  it("sends the magic link through the Cloudflare email binding", async () => {
    const send = vi.fn<(message: OutgoingMessage) => Promise<{ messageId: string }>>(async () => ({
      messageId: "cf-message-1",
    }));
    const env = createLoginEnv(true, { E2E_DISABLE_EMAIL: undefined, EMAIL: { send } });

    const response = await app.request(
      "/api/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "student@example.com" }),
      },
      env as never
    );

    expect(response.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
    const [message] = send.mock.calls[0];
    expect(message.from).toEqual({ name: "Sint Lucas Masters", email: "info@sintlucasmasters.com" });
    expect(message.to).toBe("student@example.com");
    expect(message.subject).toBe("Sign in to Sint Lucas Masters");
    expect(message.text).toContain("http://localhost:8787/auth/verify?token=");
    expect(message.html).toContain("http://localhost:8787/auth/verify?token=");
  });

  it("reports a failure when the email binding throws", async () => {
    const send = vi.fn(async () => {
      throw Object.assign(new Error("sender not verified"), { code: "invalid_sender" });
    });
    const env = createLoginEnv(true, { E2E_DISABLE_EMAIL: undefined, EMAIL: { send } });

    const response = await app.request(
      "/api/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "student@example.com" }),
      },
      env as never
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Failed to send email" });
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
