import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Miniflare } from "miniflare";
import { readFileSync, readdirSync } from "node:fs";
import { app } from "./index";

describe("GET /api/search", () => {
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
      VALUES ('renee', 'renee', 'Renée', 'renee', 'Café', 'Été',
        'MA_BK', 'digital', '2025-2026', 'A naïve view', 'Een façade', '["cliché"]')`
      )
      .run();
  });
  afterEach(async () => {
    await runtime.dispose();
  });

  const search = (query: string, headers = {}) =>
    app.request(`/api/search?${new URLSearchParams({ query })}`, { headers }, {
      DB: db,
    } as never);

  it.each(["Renee", "Renée", "RENÉE", "Rene\u0301e", "cafe", "ete", "naive", "facade", "cliche"])(
    "matches accents and case for %s",
    async (query) => {
      const response = await search(query);
      expect(response.status).toBe(200);
      expect((await response.json<{ results: { student_name: string }[] }>()).results).toEqual([
        expect.objectContaining({ student_name: "Renée" }),
      ]);
    }
  );

  it("renders the original accents in HTML search results", async () => {
    const response = await search("Renee", { Accept: "text/html" });
    expect(response.headers.get("X-Results-Count")).toBe("1");
    expect(await response.text()).toContain("Renée");
  });

  it.each(["%%", "__", "\\\\", "missing"])("treats %s as literal text", async (query) => {
    const response = await search(query);
    expect(response.status).toBe(200);
    expect((await response.json<{ results: { student_name: string }[] }>()).results).toEqual([]);
  });

  it("excludes unpublished projects", async () => {
    await db.exec("UPDATE projects SET status = 'draft'");
    expect((await (await search("Renee")).json<{ results: { student_name: string }[] }>()).results).toEqual([]);
  });

  it("matches decomposed accents in stored names", async () => {
    await db.prepare("UPDATE projects SET student_name = ?").bind("Rene\u0301e").run();
    expect((await (await search("Renee")).json<{ results: { student_name: string }[] }>()).results).toHaveLength(1);
  });

  it("matches accented queries against unaccented names", async () => {
    await db.exec("UPDATE projects SET student_name = 'Renee'");
    expect((await (await search("Renée")).json<{ results: { student_name: string }[] }>()).results).toHaveLength(1);
  });

  it.each(["masters", "graduates", "fotografie"])("respects the %s programme scope", async (site) => {
    const response = await search("Renee", { "X-Site-Override": site });
    expect((await response.json<{ results: { student_name: string }[] }>()).results).toHaveLength(
      site === "fotografie" ? 0 : 1
    );
  });

  it("applies the 60-result limit after matching and preserves sort order", async () => {
    const insert = db.prepare(`INSERT INTO projects
      (id, slug, student_name, sort_name, project_title_en, project_title_nl,
       program, academic_year, description_en, description_nl)
      VALUES (?, ?, ?, ?, '', '', 'MA_BK', '2025-2026', '', '')`);
    for (let i = 0; i < 65; i++) {
      const suffix = String(i).padStart(2, "0");
      await insert.bind(`other-${suffix}`, `other-${suffix}`, "Other", `a-${suffix}`).run();
      await insert.bind(`match-${suffix}`, `match-${suffix}`, `Renée ${suffix}`, `b-${suffix}`).run();
    }
    const response = await search("Renee");
    const { results } = await response.json<{ results: { student_name: string }[] }>();
    expect(results).toHaveLength(60);
    expect(results.map((project: { student_name: string }) => project.student_name)).toEqual(
      Array.from({ length: 60 }, (_, i) => `Renée ${String(i).padStart(2, "0")}`)
    );
  });
});
