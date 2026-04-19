import type { Bindings } from "../types";

export class UploadImageError extends Error {
  constructor(
    message: string,
    public readonly userFacing: boolean = true
  ) {
    super(message);
    this.name = "UploadImageError";
  }
}

type CfEnv = Pick<Bindings, "CLOUDFLARE_ACCOUNT_ID" | "CLOUDFLARE_API_TOKEN" | "E2E_MOCK_CLOUDFLARE_IMAGES">;

export async function uploadImage(env: CfEnv, file: File, customId: string): Promise<string> {
  if (env.E2E_MOCK_CLOUDFLARE_IMAGES === "true") {
    return customId;
  }

  const body = new FormData();
  body.append("file", file);
  body.append("id", customId);

  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v1`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` },
    body,
  });

  const payload = (await res.json()) as {
    success: boolean;
    errors?: Array<{ message: string }>;
    result?: { id: string };
  };

  if (!payload.success || !payload.result) {
    const msg = payload.errors?.[0]?.message || "Upload failed";
    if (msg.includes("dimension") || msg.includes("size")) {
      throw new UploadImageError("Image too large. Maximum: 10MB, 12,000px on longest side.");
    }
    throw new UploadImageError(msg);
  }

  return payload.result.id;
}

export async function deleteImage(env: CfEnv, cloudflareId: string): Promise<void> {
  if (env.E2E_MOCK_CLOUDFLARE_IMAGES === "true") return;

  try {
    await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v1/${cloudflareId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` },
      }
    );
  } catch {
    // Best-effort — the DB row is the source of truth; orphaned CF assets are acceptable.
  }
}
