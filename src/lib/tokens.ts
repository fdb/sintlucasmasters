// Magic link token utilities

const TOKEN_LENGTH = 32;
const TOKEN_EXPIRY_MINUTES = 15;

export function generateMagicToken(): string {
  const bytes = new Uint8Array(TOKEN_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function generateTokenId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function storeMagicToken(db: D1Database, email: string, token: string): Promise<void> {
  const id = generateTokenId();
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000).toISOString();

  await db
    .prepare(
      `INSERT INTO auth_tokens (id, email, token, expires_at)
       VALUES (?, ?, ?, ?)`
    )
    .bind(id, email.toLowerCase(), token, expiresAt)
    .run();
}

export interface VerifyTokenResult {
  valid: boolean;
  email?: string;
  error?: "not_found" | "expired" | "already_used";
}

/**
 * Check if a magic token is valid without consuming it.
 * Use this for GET requests to show a confirmation page.
 */
export async function checkMagicToken(db: D1Database, token: string): Promise<VerifyTokenResult> {
  const row = await db
    .prepare(`SELECT email, expires_at, used_at FROM auth_tokens WHERE token = ?`)
    .bind(token)
    .first<{ email: string; expires_at: string; used_at: string | null }>();

  if (!row) {
    return { valid: false, error: "not_found" };
  }

  if (row.used_at) {
    return { valid: false, error: "already_used" };
  }

  const expiresAt = new Date(row.expires_at);
  if (expiresAt < new Date()) {
    return { valid: false, error: "expired" };
  }

  return { valid: true, email: row.email };
}

/**
 * Verify and consume a magic token.
 * Use this for POST requests when the user confirms login.
 */
export async function verifyMagicToken(db: D1Database, token: string): Promise<VerifyTokenResult> {
  const result = await checkMagicToken(db, token);

  if (!result.valid) {
    return result;
  }

  // Mark token as used
  await db.prepare(`UPDATE auth_tokens SET used_at = datetime('now') WHERE token = ?`).bind(token).run();

  return result;
}
