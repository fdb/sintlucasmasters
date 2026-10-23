import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Miniflare } from "miniflare";
import { readFileSync, readdirSync } from "node:fs";
import { app } from "./index";

// Student-controlled text ends up in the page's JSON-LD <script> blocks. It
// must not be able to close the script tag and inject markup.
const PAYLOAD = "</script><script>alert(1)</script><!--";

describe("JSON-LD on project pages", () => {
  let runtime: Miniflare;
  let db: Awaited<ReturnType<Miniflare["getD1Database"]>>;

  beforeEach(async () => {
    runtime = new Miniflare({
      modules: true,
      script: "export default { fetch() { return new Response(); } }",
      compatibilityDate: "2026-03-17",
      d1Databases: ["DB"],
    });
    db = await runtime.getD1Database("DB");
    const migrations = new URL("../migrations/", import.meta.url);
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
    await db
      .prepare(
        `INSERT INTO projects
        (id, slug, student_name, sort_name, project_title_en, project_title_nl,
         program, context, academic_year, description_en, description_nl, tags)
        VALUES ('xss', 'xss', ?, 'xss', ?, ?, 'MA_BK', 'digital', '2025-2026', ?, ?, ?)`
      )
      .bind(PAYLOAD, PAYLOAD, PAYLOAD, PAYLOAD, PAYLOAD, JSON.stringify([PAYLOAD]))
      .run();
  });

  afterEach(async () => {
    await runtime.dispose();
  });

  const get = (path: string) => app.request(path, { headers: { "X-Site-Override": "masters" } }, { DB: db } as never);

  it("does not render stored non-web social links", async () => {
    await db
      .prepare("UPDATE projects SET social_links = ? WHERE id = 'xss'")
      .bind(JSON.stringify(["javascript:alert(1)", "https://example.com/"]))
      .run();
    const html = await (await get("/nl/2025-2026/ma-bk/students/xss/")).text();
    expect(html).not.toContain("javascript:");
    expect(html).toContain('href="https://example.com/"');
  });

  it.each(["/nl/2025-2026/ma-bk/students/xss/", "/nl/2025-2026/ma-bk/"])(
    "escapes student text inside ld+json on %s",
    async (path) => {
      const response = await get(path);
      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).not.toContain("<script>alert(1)</script>");

      const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
        (match) => match[1]
      );
      expect(blocks.length).toBeGreaterThan(0);
      // The escaped JSON still parses back to the original text.
      expect(blocks.some((block) => JSON.stringify(JSON.parse(block)).includes(JSON.stringify(PAYLOAD)))).toBe(true);
    }
  );
});
