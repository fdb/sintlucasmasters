import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { app } from "./index";

describe("GET /api/search", () => {
  let db: DatabaseSync;
  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    const migrations = new URL("../migrations/", import.meta.url);
    for (const file of readdirSync(migrations)
      .filter((file) => file.endsWith(".sql"))
      .sort()) {
      db.exec(readFileSync(new URL(file, migrations), "utf8"));
    }
    db.prepare(
      `INSERT INTO projects
      (id, slug, student_name, sort_name, project_title_en, project_title_nl,
       program, context, academic_year, description_en, description_nl, tags)
      VALUES ('renee', 'renee', 'Renée', 'renee', 'Café', 'Été',
        'MA_BK', 'digital', '2025-2026', 'A naïve view', 'Een façade', '["cliché"]')`
    ).run();
  });
  afterEach(() => db.close());

  const search = (query: string, headers = {}) =>
    app.request(`/api/search?${new URLSearchParams({ query })}`, { headers }, {
      DB: {
        prepare: (sql: string) => ({
          bind: (...params: string[]) => ({
            all: async () => ({ results: db.prepare(sql).all(...params) }),
          }),
        }),
      },
    } as never);

  it.each(["Renee", "RENÉE", "Rene\u0301e", "cafe", "ete", "naive", "facade", "cliche"])(
    "matches accents and case for %s",
    async (query) => {
      const response = await search(query);
      expect(response.status).toBe(200);
      expect((await response.json()).results).toEqual([expect.objectContaining({ student_name: "Renée" })]);
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
    expect((await response.json()).results).toEqual([]);
  });

  it("excludes unpublished projects", async () => {
    db.exec("UPDATE projects SET status = 'draft'");
    expect((await (await search("Renee")).json()).results).toEqual([]);
  });
});
